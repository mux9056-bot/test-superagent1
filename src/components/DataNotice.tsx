import { Modal, useDialogTitleId } from './Modal';
import { Icon } from './Icon';

export function DataNotice({ onClose }: { onClose: () => void }) {
  const titleId = useDialogTitleId('data-notice-title');
  return (
    <Modal labelledBy={titleId} onRequestClose={onClose} variant="dialog" className="data-notice">
      <p className="eyebrow">本地数据</p>
      <h2 id={titleId} className="dialog-title">
        数据说明
      </h2>
      <ul className="notice-list">
        <li>
          <Icon name="info" size={18} />
          <span>任务和清单只保存在当前浏览器（localStorage），不会上传到服务器。</span>
        </li>
        <li>
          <Icon name="info" size={18} />
          <span>
            清除网站数据、更换浏览器或设备后，数据不会自动恢复；无痕模式中的数据可能不会保留。
          </span>
        </li>
        <li>
          <Icon name="info" size={18} />
          <span>
            同一浏览器打开多个标签页时，页面会同步最新保存的数据；提交编辑前会检查冲突。
          </span>
        </li>
      </ul>
      <p className="field-hint">数据格式版本：1</p>
      <div className="dialog-actions">
        <button type="button" className="button button-primary" onClick={onClose} data-autofocus>
          知道了
        </button>
      </div>
    </Modal>
  );
}
