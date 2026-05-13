import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { notifyError } from './notify.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../.env') })

const fakeError = new Error('これはテスト通知です。本番のエラーではありません。')
await notifyError('notify-test (動作確認用)', fakeError)
console.log('送信完了。Slack 側を確認してください。')
