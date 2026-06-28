/**
 * callBack 工具单元测试
 * P2 项 3：覆盖对端解析纯函数 resolveCallBackTarget
 */

import { resolveCallBackTarget, CallRecordLike } from '../callBack';

describe('resolveCallBackTarget', () => {
  it('outgoing：对方应为 callee，且优先使用 callee_name', () => {
    const item: CallRecordLike = {
      caller_id: 'u1',
      callee_id: 'c1',
      caller_name: '我',
      callee_name: '陈志远',
      direction: 'outgoing',
      call_type: 'audio',
    };
    const result = resolveCallBackTarget(item);
    expect(result).toEqual({
      userId: 'c1',
      userName: '陈志远',
      callType: 'audio',
    });
  });

  it('incoming：对方应为 caller，且优先使用 caller_name', () => {
    const item: CallRecordLike = {
      caller_id: 'c1',
      callee_id: 'u1',
      caller_name: '陈志远',
      callee_name: '我',
      direction: 'incoming',
      call_type: 'video',
    };
    const result = resolveCallBackTarget(item);
    expect(result).toEqual({
      userId: 'c1',
      userName: '陈志远',
      callType: 'video',
    });
  });

  it('outgoing 且 callee_name 缺失：回退到 callee_id', () => {
    const item: CallRecordLike = {
      caller_id: 'u1',
      callee_id: 'c1',
      caller_name: '我',
      direction: 'outgoing',
      call_type: 'audio',
    };
    const result = resolveCallBackTarget(item);
    expect(result.userId).toBe('c1');
    expect(result.userName).toBe('c1'); // 回退到 id
  });

  it('incoming 且 caller_name 缺失：回退到 caller_id', () => {
    const item: CallRecordLike = {
      caller_id: 'k1',
      callee_id: 'u1',
      callee_name: '我',
      direction: 'incoming',
      call_type: 'video',
    };
    const result = resolveCallBackTarget(item);
    expect(result.userId).toBe('k1');
    expect(result.userName).toBe('k1');
  });

  it('call_type 应原样透传', () => {
    const audioItem: CallRecordLike = {
      caller_id: 'u1',
      callee_id: 'c1',
      direction: 'outgoing',
      call_type: 'audio',
    };
    const videoItem: CallRecordLike = {
      caller_id: 'c1',
      callee_id: 'u1',
      direction: 'incoming',
      call_type: 'video',
    };
    expect(resolveCallBackTarget(audioItem).callType).toBe('audio');
    expect(resolveCallBackTarget(videoItem).callType).toBe('video');
  });
});
