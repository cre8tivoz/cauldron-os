function waitForExit(processHandle, timeoutMs = 2000) {
  if (!processHandle || processHandle.exitCode !== null || processHandle.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    const timeout = setTimeout(resolve, timeoutMs);
    processHandle.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function stopProcess(processHandle, timeoutMs = 2000) {
  if (!processHandle || processHandle.exitCode !== null || processHandle.signalCode !== null) {
    return;
  }

  const exited = waitForExit(processHandle, timeoutMs);
  try {
    processHandle.kill('SIGTERM');
  } catch {
    // Process already gone; treat cleanup as complete.
  }
  await exited;
}

module.exports = { stopProcess };
