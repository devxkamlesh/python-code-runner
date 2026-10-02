import { loadPyodide } from 'pyodide';

const py = await loadPyodide();

globalThis.asyncPromptModal = async (promptText) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('User typed this in custom modal: 42');
    }, 100);
  });
};

try {
  await py.runPythonAsync(`
import builtins
import js

# Can we await or handle async prompt in regular synchronous python code?
`);
} catch (e) {
  console.log('Error:', e);
}
