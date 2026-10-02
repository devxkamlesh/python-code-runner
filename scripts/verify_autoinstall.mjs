import { loadPyodide } from "pyodide";

async function verifyAutoInstall() {
  console.log("1. Initializing Pyodide runtime...");
  const pyodide = await loadPyodide();
  console.log("   Pyodide loaded successfully.");

  const MODULE_TO_PYPI = {
    bs4: 'beautifulsoup4',
    PIL: 'pillow',
    yaml: 'pyyaml',
    cv2: 'opencv-python',
    cowsay: 'cowsay'
  };

  const scriptCode = `
import cowsay
cowsay.cow("Auto-install works without manual steps!")
`;

  console.log("2. Simulating execution of script with uninstalled package 'cowsay'...");

  let output = [];
  pyodide.setStdout({
    batched: (str) => output.push(str)
  });

  const maxAutoInstalls = 3;
  let autoInstallCount = 0;
  const attempted = new Set();
  let autoInstalledSuccess = false;

  while (true) {
    try {
      await pyodide.runPythonAsync(scriptCode);
      console.log("   Script execution completed successfully.");
      break;
    } catch (err) {
      const errStr = (err && err.message) ? err.message : String(err);
      const missingMatch = errStr.match(/No module named ['"]([a-zA-Z0-9_]+)/i);

      if (missingMatch && missingMatch[1] && autoInstallCount < maxAutoInstalls) {
        const missingMod = missingMatch[1];
        const pypiPkg = MODULE_TO_PYPI[missingMod] || missingMod.toLowerCase();

        if (attempted.has(pypiPkg)) {
          throw err;
        }
        attempted.add(pypiPkg);
        autoInstallCount++;

        console.log(`3. Auto-detected missing library '${missingMod}'. Installing '${pypiPkg}' from PyPI via micropip...`);
        await pyodide.loadPackage('micropip');
        const micropip = pyodide.pyimport('micropip');
        await micropip.install(pypiPkg);
        autoInstalledSuccess = true;
        console.log(`   Package '${pypiPkg}' mounted successfully into virtual environment.`);
        continue;
      } else {
        throw err;
      }
    }
  }

  console.log("\n4. Verification Results:");
  console.log("   Auto-installed successfully:", autoInstalledSuccess);
  console.log("   Captured script output:\n" + output.join("\n"));

  if (!autoInstalledSuccess || !output.join("\n").includes("Auto-install works")) {
    throw new Error("Verification failed: output did not contain expected content");
  }

  console.log("\n5. ALL AUTO-INSTALL ENGINE CHECKS PASSED.");
}

verifyAutoInstall().catch((err) => {
  console.error("Auto-install verification failed:", err);
  process.exit(1);
});
