/**
 * MessageService - 消息服务
 * 定义消息类型和接口，用于消息列表和订单卡片展示。
 */
export interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string;
  content?: string;
  content_type?: 'text' | 'order_card' | 'image' | 'voice';
  message_type?: string;
  is_read?: number;
  created_at: string | number;
}


