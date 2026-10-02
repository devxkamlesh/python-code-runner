import { loadPyodide } from "pyodide";

async function testFallback() {
  const py = await loadPyodide();
  
  // Test case 2: 2 preloaded items, 3rd from dynamic prompt simulation
  let inputQueue = ["kamlesh", "21"];
  let dynamicInputs = ["500"];
  let callCount = 0;

  py.setStdin({
    isatty: true,
    autoEOF: true,
    stdin: () => {
      callCount++;
      if (inputQueue.length > 0) {
        return inputQueue.shift();
      }
      if (dynamicInputs.length > 0) {
        return dynamicInputs.shift();
      }
      return null;
    }
  });

  const code = `
name = input("Enter your name: ")
age = input("Enter your age: ")
number = input("Enter a number: ")
print("Outputs:")
print(name)
print(age)
print(number)
`;

  console.log("Running fallback test...");
  await py.runPythonAsync(code);
  console.log("Success with dynamic fallback! Total calls:", callCount);
}

testFallback().catch(console.error);
