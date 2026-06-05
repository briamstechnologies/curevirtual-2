const { execSync } = require('child_process');

function killPort(port) {
  console.log(`🔍 Checking port ${port}...`);
  try {
    const cmd = `netstat -ano | findstr :${port}`;
    const output = execSync(cmd, { encoding: 'utf8' });
    const lines = output.split('\n');
    const pids = new Set();
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        // Netstat columns: Proto | Local Address | Foreign Address | State | PID
        const localAddress = parts[1];
        if (localAddress.endsWith(`:${port}`)) {
          const pid = parts[parts.length - 1];
          if (parseInt(pid) > 0) {
            pids.add(pid);
          }
        }
      }
    }
    
    if (pids.size === 0) {
      console.log(`✅ Port ${port} is clear.`);
      return;
    }
    
    for (const pid of pids) {
      console.log(`💥 Killing process ${pid} using port ${port}...`);
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'inherit' });
      } catch (e) {
        console.warn(`⚠️ Failed to kill process ${pid}: ${e.message}`);
      }
    }
  } catch (err) {
    // If findstr doesn't match anything, it returns exit code 1 which causes execSync to throw.
    // That means the port is free!
    console.log(`✅ Port ${port} is clear.`);
  }
}

console.log("🧹 Pre-startup port cleanup initialized...");
killPort(5001); // Backend
killPort(5173); // Frontend Vite
console.log("✨ Cleanup complete! Starting servers...\n");
