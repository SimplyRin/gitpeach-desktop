import { getSHA } from './git-info'
import { getUpdatesURL, getChannel } from '../script/dist-info'
import { version, productName } from './package.json'

// Development OAuth credentials - DO NOT USE IN PRODUCTION
const devClientId = '3a723b10ac5575cc5bb9'
const devClientSecret = '22c34d87789a365981ed921352a7b9a8c3f69d54'

// Production OAuth credentials for GitPeach Desktop
// Set DESKTOP_OAUTH_CLIENT_ID and DESKTOP_OAUTH_CLIENT_SECRET environment variables
const prodClientId = 'Ov23liO8ZjyHQX8hAqzM' // GitPeach Desktop production client ID
const prodClientSecret = process.env.DESKTOP_OAUTH_CLIENT_SECRET || ''

const channel = getChannel()

const s = JSON.stringify

export function getReplacements() {
  const isDevBuild = channel === 'development'
  
  // Use production credentials for non-development builds
  const clientId = isDevBuild ? devClientId : (process.env.DESKTOP_OAUTH_CLIENT_ID || prodClientId)
  const clientSecret = isDevBuild ? devClientSecret : (process.env.DESKTOP_OAUTH_CLIENT_SECRET || prodClientSecret)

  return {
    __OAUTH_CLIENT_ID__: s(clientId),
    __OAUTH_SECRET__: s(clientSecret),
    __DARWIN__: process.platform === 'darwin',
    __WIN32__: process.platform === 'win32',
    __LINUX__: process.platform === 'linux',
    __APP_NAME__: s(productName),
    __APP_VERSION__: s(version),
    __DEV__: isDevBuild,
    __DEV_SECRETS__: isDevBuild || !process.env.DESKTOP_OAUTH_CLIENT_SECRET,
    __RELEASE_CHANNEL__: s(channel),
    __UPDATES_URL__: s(getUpdatesURL()),
    __SHA__: s(getSHA()),
    'process.platform': s(process.platform),
    'process.env.NODE_ENV': s(process.env.NODE_ENV || 'development'),
    'process.env.TEST_ENV': s(process.env.TEST_ENV),
  }
}
