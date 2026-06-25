$ErrorActionPreference='Stop'
Write-Host 'Creating temp files'
[System.IO.File]::WriteAllBytes('tmp_video.mp4',[System.Text.Encoding]::UTF8.GetBytes('dummy video content'))
[System.IO.File]::WriteAllBytes('tmp_audio.wav',[System.Text.Encoding]::UTF8.GetBytes('dummy audio content'))

Write-Host 'Generate upload URL'
$body = @{ template_id='tpl_1'; scene_index=0; fileName='tmp_video.mp4' } | ConvertTo-Json
$gen = Invoke-RestMethod -Uri 'http://localhost:4000/api/proclips/generate-upload-url' -Method Post -Body $body -ContentType 'application/json'
Write-Host 'Generate result:'; $gen | ConvertTo-Json -Depth 5 | Write-Host

$uploadUrl = $gen.uploadUrl
$key = $gen.key
Write-Host 'Uploading file via PUT to' $uploadUrl
Invoke-RestMethod -Uri $uploadUrl -Method Put -InFile tmp_video.mp4 -ContentType 'application/octet-stream' | Out-Null
Write-Host 'PUT done'

Write-Host 'Confirming scene upload'
$confBody = @{ template_id='tpl_1'; scene_index=0; key=$key } | ConvertTo-Json
$conf = Invoke-RestMethod -Uri 'http://localhost:4000/api/proclips/confirm-scene-upload' -Method Post -Body $confBody -ContentType 'application/json'
Write-Host 'Confirm result:'; $conf | ConvertTo-Json -Depth 5 | Write-Host

Write-Host 'Uploading voice sample (binary POST)'
$voiceResp = Invoke-RestMethod -Uri 'http://localhost:4000/api/proclips/record-voice' -Method Post -InFile tmp_audio.wav -ContentType 'application/octet-stream'
Write-Host 'Voice upload result:'; $voiceResp | ConvertTo-Json -Depth 5 | Write-Host

Write-Host 'Submitting mix task'
$submitBody = @{ template_id='tpl_1'; product_name='测试商品'; product_features='好用'; product_price='¥99'; script='测试文案'; voice_sample_uri=$voiceResp.remoteUrl; scene_uploads=@(@{ sceneIndex=0; remoteUrl=$uploadUrl }) } | ConvertTo-Json
$submit = Invoke-RestMethod -Uri 'http://localhost:4000/api/proclips/mix/submit' -Method Post -Body $submitBody -ContentType 'application/json'
Write-Host 'Submit result:'; $submit | ConvertTo-Json -Depth 5 | Write-Host

$taskId = $submit.taskId
Write-Host 'Polling status for' $taskId
for ($i=0; $i -lt 10; $i++) {
    Start-Sleep -Seconds 2
    $status = Invoke-RestMethod -Uri "http://localhost:4000/api/proclips/mix/status/$taskId" -Method Get
    Write-Host ("Poll {0}: {1}" -f $i, ($status | ConvertTo-Json -Depth 5))
    if ($status.status -eq 'completed') { break }
}
Write-Host 'Smoke test done.'
