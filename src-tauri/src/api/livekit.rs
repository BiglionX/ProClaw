// LiveKit token API (PRD v4.1 Phase 1)

use axum::{
    extract::Extension,
    http::StatusCode,
    Json,
};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::{Deserialize, Serialize};

use super::auth::Claims;

const DEFAULT_TOKEN_TTL_SECS: i64 = 3600;

#[derive(Debug, Deserialize)]
pub struct LiveKitTokenRequest {
    #[serde(alias = "roomName")]
    pub room_name: String,
    #[serde(alias = "participantIdentity")]
    pub participant_identity: String,
    #[serde(alias = "participantName")]
    pub participant_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct LiveKitVideoGrant {
    #[serde(rename = "roomJoin")]
    room_join: bool,
    room: String,
    #[serde(rename = "canPublish")]
    can_publish: bool,
    #[serde(rename = "canSubscribe")]
    can_subscribe: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct LiveKitJwtClaims {
    iss: String,
    sub: String,
    nbf: i64,
    exp: i64,
    video: LiveKitVideoGrant,
    #[serde(skip_serializing_if = "Option::is_none")]
    name: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveKitTokenResponse {
    pub token: String,
    pub url: String,
    pub room_name: String,
}

fn livekit_config() -> Result<(String, String, String), (StatusCode, Json<serde_json::Value>)> {
    let url = std::env::var("LIVEKIT_URL").map_err(|_| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({"error": "LiveKit is not configured (LIVEKIT_URL missing)"})),
        )
    })?;
    let api_key = std::env::var("LIVEKIT_API_KEY").map_err(|_| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({"error": "LiveKit is not configured (LIVEKIT_API_KEY missing)"})),
        )
    })?;
    let api_secret = std::env::var("LIVEKIT_API_SECRET").map_err(|_| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({"error": "LiveKit is not configured (LIVEKIT_API_SECRET missing)"})),
        )
    })?;
    Ok((url, api_key, api_secret))
}

fn validate_room_name(room_name: &str) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    if room_name.starts_with("proclaw-call-") && room_name.len() <= 128 {
        return Ok(());
    }
    Err((
        StatusCode::BAD_REQUEST,
        Json(serde_json::json!({"error": "Invalid roomName (expected proclaw-call-* prefix)"})),
    ))
}

fn create_livekit_token(
    api_key: &str,
    api_secret: &str,
    room_name: &str,
    identity: &str,
    display_name: Option<&str>,
) -> Result<String, jsonwebtoken::errors::Error> {
    let now = chrono::Utc::now().timestamp();
    let claims = LiveKitJwtClaims {
        iss: api_key.to_string(),
        sub: identity.to_string(),
        nbf: now,
        exp: now + DEFAULT_TOKEN_TTL_SECS,
        video: LiveKitVideoGrant {
            room_join: true,
            room: room_name.to_string(),
            can_publish: true,
            can_subscribe: true,
        },
        name: display_name.map(|s| s.to_string()),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(api_secret.as_bytes()),
    )
}

pub async fn issue_livekit_token(
    Extension(claims): Extension<Claims>,
    Json(req): Json<LiveKitTokenRequest>,
) -> Result<Json<LiveKitTokenResponse>, (StatusCode, Json<serde_json::Value>)> {
    if req.participant_identity != claims.sub {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "participantIdentity must match authenticated user"})),
        ));
    }

    validate_room_name(&req.room_name)?;

    let (url, api_key, api_secret) = livekit_config()?;

    let token = create_livekit_token(
        &api_key,
        &api_secret,
        &req.room_name,
        &req.participant_identity,
        req.participant_name.as_deref(),
    )
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to create LiveKit token: {}", e)})),
        )
    })?;

    Ok(Json(LiveKitTokenResponse {
        token,
        url,
        room_name: req.room_name,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_room_name_accepts_proclaw_prefix() {
        assert!(validate_room_name("proclaw-call-session-1").is_ok());
    }

    #[test]
    fn validate_room_name_rejects_arbitrary() {
        assert!(validate_room_name("other-room").is_err());
    }

    #[test]
    fn create_token_has_three_jwt_parts() {
        let token = create_livekit_token(
            "test_api_key",
            "test_api_secret",
            "proclaw-call-abc",
            "user-1",
            Some("Alice"),
        )
        .expect("token");
        assert_eq!(token.split('.').count(), 3);
    }
}