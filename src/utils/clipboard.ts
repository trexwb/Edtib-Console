import { translate } from '/@/i18n'
import { gp } from '/@vab/plugins/vab'

function clipboardSuccess(text: any) {
  gp.$baseMessage(`${translate('拷贝')}${text}${translate('成功')}`, 'success', 'hey')
}

function clipboardError(text: any) {
  gp.$baseMessage(`${translate('拷贝')}${text}${translate('失败')}`, 'error', 'hey')
}

/**
 * @description 复制数据
 * @param text
 */
export default function handleClipboard(text: string) {
  const { isSupported, copy } = useClipboard()
  if (!isSupported) {
    usePermission('clipboard-write')
  }
  copy(text)
    .then(() => {
      clipboardSuccess(text)
    })
    .catch(() => {
      clipboardError(text)
    })
}
