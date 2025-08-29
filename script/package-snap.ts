import * as Path from 'path'
import * as Fs from 'fs'
import { execSync } from 'child_process'

import { getVersion } from '../app/package-info'
import { getDistRoot } from './dist-info'

const projectRoot = Path.join(__dirname, '..')
const distRoot = getDistRoot()

export async function buildSnap(): Promise<void> {
  console.log('🔨 Building Snap package for GitPeach Desktop...')

  // Check if .deb file exists
  const debFiles = Fs.readdirSync(distRoot).filter(file => 
    file.startsWith('rin-gitpeach-desktop_') && file.endsWith('.deb')
  )

  if (debFiles.length === 0) {
    throw new Error(
      'No .deb file found in dist/ directory. Please build the Debian package first using: yarn package:linux'
    )
  }

  const debFile = debFiles[0]
  console.log(`📦 Found .deb file: ${debFile}`)

  // Check if snapcraft is available
  try {
    execSync('snapcraft --version', { stdio: 'pipe' })
  } catch (error) {
    throw new Error(
      'snapcraft is not installed. Please install it with: sudo snap install snapcraft --classic'
    )
  }

  // Update version in snapcraft.yaml
  const snapcraftPath = Path.join(projectRoot, 'snapcraft.yaml')
  let snapcraftContent = Fs.readFileSync(snapcraftPath, 'utf8')
  
  const version = getVersion()
  snapcraftContent = snapcraftContent.replace(
    /^version: .+$/m,
    `version: '${version}'`
  )
  
  Fs.writeFileSync(snapcraftPath, snapcraftContent)
  console.log(`📝 Updated version to ${version} in snapcraft.yaml`)

  // Clean previous builds
  console.log('🧹 Cleaning previous builds...')
  try {
    execSync('snapcraft clean', { cwd: projectRoot, stdio: 'pipe' })
  } catch (error) {
    // Ignore clean errors
  }

  // Remove old snap files
  const oldSnapFiles = Fs.readdirSync(projectRoot).filter(file => file.endsWith('.snap'))
  oldSnapFiles.forEach(file => {
    Fs.unlinkSync(Path.join(projectRoot, file))
  })

  // Build the snap package
  console.log('🏗️  Building snap package...')
  try {
    execSync('snapcraft --verbose', { 
      cwd: projectRoot, 
      stdio: 'inherit',
      env: { ...process.env }
    })
  } catch (error) {
    throw new Error(`Snap build failed: ${error}`)
  }

  // Find and move the generated snap file
  const snapFiles = Fs.readdirSync(projectRoot).filter(file => file.endsWith('.snap'))
  
  if (snapFiles.length === 0) {
    throw new Error('No snap package was generated')
  }

  const snapFile = snapFiles[0]
  const sourcePath = Path.join(projectRoot, snapFile)
  const destPath = Path.join(distRoot, snapFile)

  Fs.renameSync(sourcePath, destPath)
  console.log(`📦 Moved snap package to dist/${snapFile}`)

  // Display package info
  try {
    const snapInfo = execSync(`snap info ${destPath}`, { encoding: 'utf8', stdio: 'pipe' })
    console.log('📋 Package information:')
    console.log(snapInfo)
  } catch (error) {
    // Ignore snap info errors
  }

  console.log('✅ Snap package build completed successfully!')
}
