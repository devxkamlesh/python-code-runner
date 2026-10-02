import { loadPyodide } from 'pyodide';

const py = await loadPyodide();

py.setStdin({
  isatty: true,
  stdin: async () => {
    console.log('Async stdin called!');
    await new Promise(r => setTimeout(r, 100));
    return '42';
  }
});

try {
  await py.runPythonAsync(`
x = input("Enter something: ")
print("Got input:", x)
`);
} catch (e) {
  console.log('Error with async stdin:', e.message);
}
