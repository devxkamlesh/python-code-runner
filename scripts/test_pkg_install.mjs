import { loadPyodide } from "pyodide";

async function testPackageStrategy() {
  console.log("1. Initializing Pyodide...");
  const py = await loadPyodide();

  console.log("2. Loading numpy via loadPackage...");
  await py.loadPackage("numpy");
  console.log("   Numpy loaded successfully.");

  console.log("3. Loading requests via micropip...");
  await py.loadPackage("micropip");
  const micropip = py.pyimport("micropip");
  await micropip.install("requests");
  console.log("   Requests installed successfully.");

  console.log("4. Running verification code...");
  py.runPython(`
import numpy as np
import requests
print("NumPy version:", np.__version__)
print("Requests version:", requests.__version__)
`);
  console.log("5. Verification complete!");
}

testPackageStrategy().catch(console.error);
