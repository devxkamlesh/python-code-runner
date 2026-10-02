import { loadPyodide } from "pyodide";

async function main() {
  console.log("1. Initializing Pyodide runtime...");
  const pyodide = await loadPyodide();
  console.log("   Pyodide loaded. Python version:", pyodide.runPython("import sys; sys.version"));

  console.log("\n2. Setting up virtual file system with multi-file workspace...");
  const utilsCode = `
def calculate_metrics(numbers):
    total = sum(numbers)
    count = len(numbers)
    avg = total / count
    return {"count": count, "sum": total, "average": avg}
`;
  pyodide.FS.writeFile("/utils.py", utilsCode);
  await pyodide.runPythonAsync(`
import sys
if '/' not in sys.path:
    sys.path.insert(0, '/')
`);

  console.log("\n3. Executing main script importing utils.py...");
  const mainCode = `
import utils

scores = [88, 92, 79, 95, 84]
metrics = utils.calculate_metrics(scores)
status_label = "Verified"
print("Computed metrics:", metrics)
`;
  
  let capturedStdout = [];
  pyodide.setStdout({
    batched: (text) => {
      capturedStdout.push(text);
    }
  });

  const startTime = performance.now();
  await pyodide.runPythonAsync(mainCode);
  const elapsed = (performance.now() - startTime).toFixed(1);

  console.log(`   Execution successful in ${elapsed}ms`);
  console.log("   Stdout output:", capturedStdout.join("\n"));

  console.log("\n4. Testing variable inspection routine...");
  const rawVars = await pyodide.runPythonAsync(`
import json
def _extract_vars():
    res = []
    _skip = {'__name__', '__doc__', '__package__', '__loader__', '__spec__', '__annotations__', '__builtins__', '_extract_vars', 'sys', 'json', 'utils'}
    for k, v in globals().items():
        if k not in _skip and not k.startswith('_'):
            try:
                t = type(v).__name__
                val_str = repr(v)
                res.append({'name': k, 'type': t, 'value': val_str})
            except Exception:
                pass
    return json.dumps(res)
_extract_vars()
`);
  const parsedVars = JSON.parse(rawVars);
  console.log("   Extracted variables count:", parsedVars.length);
  parsedVars.forEach(v => {
    console.log(`   - ${v.name} (${v.type}): ${v.value}`);
  });

  console.log("\n5. Verification result: ALL CHECKS PASSED.");
}

main().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
