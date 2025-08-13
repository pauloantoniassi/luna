import fs from 'fs';
import path from 'path';

/**
 * Finds the project root by searching upwards for a `package.json` file.
 * @returns The absolute path to the project root.
 * @throws {Error} An error if the project root cannot be found based on the termination conditions.
 */
export default function getProjectRootDir(): string {
  let currentDir = __dirname;
  const cwd = process.cwd();

  // Limit the search to a maximum of 10 levels to prevent infinite loops.
  for (let i = 0; i < 10; i++) {
    const packageJsonPath = path.join(currentDir, 'package.json');

    // If package.json is found, we've found the project root.
    if (fs.existsSync(packageJsonPath)) {
      return currentDir;
    }

    // As a fallback, if we reach the CWD, assume it's the root.
    if (currentDir === cwd) {
      return cwd;
    }

    const parentDir = path.dirname(currentDir);

    // If path.dirname() returns the same directory, we've reached the filesystem root.
    if (parentDir === currentDir) {
      throw new Error('Reached filesystem root without finding package.json.');
    }

    currentDir = parentDir;
  }

  throw new Error('Could not find project root within 10 directory levels.');
}
