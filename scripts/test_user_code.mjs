import { loadPyodide } from "pyodide";

async function testCRLFandLF() {
  const py = await loadPyodide();

  const userCode = `
name = input("Enter your name: ")
age = input("Enter your age: ")
number = input("Enter a number: ")
print(f"SUCCESS: name={name}, age={age}, number={number}")
`;

  // Test with CRLF string
  const rawStdin = "kamlesh\r\n21\r\n500";
  const queue = rawStdin.split(/\r?\n/);

  py.setStdin({
    isatty: true,
    autoEOF: true,
    stdin: () => {
      if (queue.length > 0) {
        return queue.shift();
      }
      return null;
    }
  });

  let output = [];
  py.setStdout({
    batched: (str) => output.push(str)
  });

  await py.runPythonAsync(userCode);

  console.log("Output from CRLF test:\n" + output.join("\n"));
  if (!output.join("\n").includes("SUCCESS: name=kamlesh, age=21, number=500")) {
    throw new Error("Failed match");
  }
}

testCRLFandLF().catch(console.error);
