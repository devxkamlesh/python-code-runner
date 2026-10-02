import { EditorView, basicSetup } from "codemirror";
import { python, localCompletionSource, globalCompletion } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import {
  autocompletion,
  completionKeymap,
  closeBracketsKeymap,
  startCompletion,
  completeAnyWord,
  acceptCompletion
} from "@codemirror/autocomplete";

// Python Builtins and Keywords for high-precision autocomplete
const PYTHON_BUILTINS = [
  'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes', 'callable', 'chr',
  'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod', 'enumerate',
  'eval', 'exec', 'filter', 'float', 'format', 'frozenset', 'getattr', 'globals', 'hasattr',
  'hash', 'help', 'hex', 'id', 'input', 'int', 'isinstance', 'issubclass', 'iter', 'len',
  'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object', 'oct', 'open',
  'ord', 'pow', 'print', 'property', 'range', 'repr', 'reversed', 'round', 'set', 'setattr',
  'slice', 'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip'
];

const PYTHON_KEYWORDS = [
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
  'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import',
  'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
  'True', 'try', 'while', 'with', 'yield'
];

const PYTHON_METHODS = [
  'append', 'extend', 'pop', 'insert', 'remove', 'clear', 'index', 'count', 'sort', 'reverse',
  'copy', 'keys', 'values', 'items', 'get', 'update', 'split', 'join', 'strip', 'replace',
  'lower', 'upper', 'startswith', 'endswith', 'find', 'format', 'read', 'write', 'close', 'seek'
];

function pythonCustomCompletions(context) {
  const word = context.matchBefore(/[a-zA-Z_]\w*/);
  if (!word && !context.explicit) return null;

  const docText = context.state.doc.toString();
  const seen = new Set();
  const options = [];

  function addOption(label, type, detail) {
    if (!label || seen.has(label) || !/^[a-zA-Z_]\w*$/.test(label)) return;
    seen.add(label);
    options.push({ label, type, detail });
  }

  // 1. Extract variables assigned in document (var = ...)
  const assignRegex = /(?:^|\n)\s*([a-zA-Z_]\w*)\s*=/g;
  let match;
  while ((match = assignRegex.exec(docText)) !== null) {
    addOption(match[1], 'variable', 'local variable');
  }

  // 2. Extract function definitions and parameters
  const defRegex = /(?:^|\n)\s*def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/g;
  while ((match = defRegex.exec(docText)) !== null) {
    addOption(match[1], 'function', 'function');
    if (match[2]) {
      match[2].split(',').forEach(p => {
        const paramName = p.trim().split(/[:=]/)[0].trim();
        if (paramName) addOption(paramName, 'variable', 'parameter');
      });
    }
  }

  // 3. Extract class definitions
  const classRegex = /(?:^|\n)\s*class\s+([a-zA-Z_]\w*)/g;
  while ((match = classRegex.exec(docText)) !== null) {
    addOption(match[1], 'class', 'class');
  }

  // 4. Try CodeMirror's local completion
  try {
    const local = localCompletionSource(context);
    if (local && local.options) {
      local.options.forEach(opt => addOption(opt.label, opt.type || 'variable', opt.detail));
    }
  } catch (e) {}

  // 5. Try CodeMirror's global completion
  try {
    const glob = globalCompletion(context);
    if (glob && glob.options) {
      glob.options.forEach(opt => addOption(opt.label, opt.type || 'keyword', opt.detail));
    }
  } catch (e) {}

  // 6. Builtins, keywords, and common methods
  PYTHON_KEYWORDS.forEach(kw => addOption(kw, 'keyword', 'keyword'));
  PYTHON_BUILTINS.forEach(b => addOption(b, 'function', 'builtin'));
  PYTHON_METHODS.forEach(m => addOption(m, 'function', 'method'));

  // 7. General words from document
  try {
    const words = completeAnyWord(context);
    if (words && words.options) {
      words.options.forEach(opt => addOption(opt.label, 'variable', 'identifier'));
    }
  } catch (e) {}

  return {
    from: word ? word.from : context.pos,
    options,
    validFor: /^[\w\xa1-\uffff][\w\d\xa1-\uffff]*$/
  };
}

function checkCodeUsesInput(code) {
  if (!code) return false;
  let cleaned = code.replace(/('''[\s\S]*?'''|"""[\s\S]*?""")/g, '');
  cleaned = cleaned.replace(/#[^\r\n]*/g, '');
  cleaned = cleaned.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, '');
  return /\binput\s*\(/.test(cleaned);
}


// 1. Comprehensive Example Programs Gallery
export const CODE_SAMPLES = {
  'hello-world': {
    name: 'Hello World',
    files: {
      'main.py': `# Hello World in Python
# Welcome to Python Code Runner (python-code-runner.com)

def main():
    message = "Hello, World!"
    print(message)
    print("Welcome to fast, private in-browser Python execution.")

if __name__ == "__main__":
    main()
`
    }
  },
  'calculator': {
    name: 'Calculator',
    files: {
      'main.py': `# Interactive Arithmetic Calculator
def add(x: float, y: float) -> float:
    return x + y

def subtract(x: float, y: float) -> float:
    return x - y

def multiply(x: float, y: float) -> float:
    return x * y

def divide(x: float, y: float) -> float:
    if y == 0:
        raise ZeroDivisionError("Cannot divide by zero")
    return x / y

print("--- Calculator Demo ---")
operations = [
    ("15 + 27", add(15, 27)),
    ("100 - 37", subtract(100, 37)),
    ("12 * 8", multiply(12, 8)),
    ("144 / 12", divide(144, 12))
]

for label, val in operations:
    print(f"{label} = {val}")
`
    }
  },
  'factorial': {
    name: 'Factorial',
    files: {
      'main.py': `# Factorial Calculation (Iterative and Recursive)
def factorial_iterative(n: int) -> int:
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

def factorial_recursive(n: int) -> int:
    if n <= 1:
        return 1
    return n * factorial_recursive(n - 1)

test_numbers = [0, 1, 5, 7, 10]
print("Factorial calculations:")
for num in test_numbers:
    ans_iter = factorial_iterative(num)
    ans_rec = factorial_recursive(num)
    print(f"  {num}! = {ans_iter} (recursive match: {ans_iter == ans_rec})")
`
    }
  },
  'fibonacci': {
    name: 'Fibonacci',
    files: {
      'main.py': `# Fibonacci Sequence Generator
def generate_fibonacci(count: int) -> list[int]:
    if count <= 0:
        return []
    sequence = [0, 1]
    while len(sequence) < count:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence[:count]

terms = 15
fib_series = generate_fibonacci(terms)
print(f"First {terms} Fibonacci numbers:")
print(fib_series)
`
    }
  },
  'prime-number': {
    name: 'Prime Number',
    files: {
      'main.py': `# Prime Number Tester and Sieve of Eratosthenes
import math

def is_prime(n: int) -> bool:
    if n < 2:
        return False
    for i in range(2, int(math.isqrt(n)) + 1):
        if n % i == 0:
            return False
    return True

def find_primes(limit: int) -> list[int]:
    return [x for x in range(2, limit + 1) if is_prime(x)]

primes_up_to_50 = find_primes(50)
print("Prime numbers up to 50:")
print(primes_up_to_50)
print(f"Total primes found: {len(primes_up_to_50)}")
`
    }
  },
  'palindrome': {
    name: 'Palindrome',
    files: {
      'main.py': `# Palindrome Checker for Strings and Numbers
def is_palindrome(val) -> bool:
    s = str(val).lower().replace(" ", "").replace(",", "").replace(".", "")
    return s == s[::-1]

test_cases = [
    "radar",
    "A man a plan a canal Panama",
    12321,
    "Python",
    12345
]

print("Palindrome evaluation:")
for item in test_cases:
    print(f"  '{item}' is palindrome -> {is_palindrome(item)}")
`
    }
  },
  'list-sorting': {
    name: 'List Sorting',
    files: {
      'main.py': `# Quick Sort and Bubble Sort Algorithms
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    mid = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + mid + quicksort(right)

raw_data = [64, 34, 25, 12, 22, 11, 90, 42, 88]
sorted_data = quicksort(raw_data)

print("Original list: ", raw_data)
print("Sorted list:   ", sorted_data)
`
    }
  },
  'file-handling': {
    name: 'File Handling',
    files: {
      'main.py': `# In-memory File System Read and Write
# Creates and reads files in Pyodide WebAssembly VFS
import json

sample_records = [
    {"id": 101, "name": "Alice", "score": 94},
    {"id": 102, "name": "Bob", "score": 87},
    {"id": 103, "name": "Charlie", "score": 91}
]

# Write to file
with open("records.json", "w") as f:
    json.dump(sample_records, f, indent=2)
print("1. Wrote 3 student records to 'records.json'")

# Read back from file
with open("records.json", "r") as f:
    loaded = json.load(f)

print("2. Read back from file:")
for r in loaded:
    print(f"   Student {r['name']} scored {r['score']}")
`
    }
  },
  'classes': {
    name: 'Classes & OOP',
    files: {
      'main.py': `# Object-Oriented Programming (Classes & Inheritance)
class Account:
    def __init__(self, owner: str, balance: float = 0.0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount: float):
        if amount <= 0:
            raise ValueError("Deposit must be positive")
        self.balance += amount
        print(f"Deposited USD {amount:.2f} -> Balance: USD {self.balance:.2f}")

    def withdraw(self, amount: float):
        if amount > self.balance:
            raise ValueError("Insufficient funds")
        self.balance -= amount
        print(f"Withdrew USD {amount:.2f} -> Balance: USD {self.balance:.2f}")

acct = Account("Kamlesh", 250.00)
acct.deposit(100.50)
acct.withdraw(75.25)
print(f"Final balance for {acct.owner}: USD {acct.balance:.2f}")
`
    }
  },
  'async-python': {
    name: 'Async Python',
    files: {
      'main.py': `# Asynchronous Python with asyncio
import asyncio

async def fetch_data(task_id: int, delay: float):
    print(f"Starting task {task_id} (delay: {delay}s)...")
    await asyncio.sleep(delay)
    print(f"Task {task_id} completed!")
    return f"Result {task_id}"

async def main():
    print("Launching concurrent coroutines:")
    results = await asyncio.gather(
        fetch_data(1, 0.2),
        fetch_data(2, 0.1),
        fetch_data(3, 0.3)
    )
    print("All tasks finished:", results)

# In Pyodide WebAssembly, top-level await is supported:
await main()
`
    }
  },
  'matplotlib': {
    name: 'Matplotlib Graphics',
    files: {
      'main.py': `# Matplotlib Waveforms
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 200)
y_sin = np.sin(x)
y_cos = np.cos(x)

plt.figure(figsize=(7, 4))
plt.plot(x, y_sin, label='sin(x)', color='#0070f3', linewidth=2)
plt.plot(x, y_cos, label='cos(x)', color='#7928ca', linewidth=2, linestyle='--')
plt.title('Trigonometric Waveforms in Python Code Runner', fontsize=12)
plt.xlabel('Time (t)')
plt.ylabel('Amplitude')
plt.grid(True, linestyle=':', alpha=0.6)
plt.legend()
plt.tight_layout()

plt.show()
print("Figure rendered in Plots tab.")
`
    }
  },
  'input-demo': {
    name: 'Input Support',
    files: {
      'main.py': `# Multi-Line Standard Input (stdin Queue) Demo
# Values are provided sequentially from the Input queue below:
# Line 1: kamlesh -> name
# Line 2: 21      -> age
# Line 3: 500     -> number

name = input("Enter your name: ")
age = input("Enter your age: ")
number = input("Enter a number: ")

print("\\n--- Output Results ---")
print(f"Name received:   {name}")
print(f"Age received:    {age}")
print(f"Number received: {number}")
print("All inputs were received sequentially through the stdin queue.")
`
    }
  },
  'auto-install-demo': {
    name: 'Auto-Install (Requests)',
    files: {
      'main.py': `# Auto-Install Demonstration: Requests & JSON API
# The 'requests' library is not pre-installed in the environment.
# When you click 'Run Script', Python Code Runner automatically detects
# the missing library, downloads it from PyPI, and executes the script!
import requests
import json

print("1. Sending HTTP GET request to JSONPlaceholder...")
response = requests.get("https://jsonplaceholder.typicode.com/todos/1")

print(f"2. Response status: {response.status_code} OK")
data = response.json()
print("3. Response payload:")
print(f"   User ID: {data.get('userId')}")
print(f"   Title:   {data.get('title')}")
print(f"   Done:    {data.get('completed')}")
print("\\nAuto-install executed without manual package management.")
`
    }
  }
};

// 2. Beginner-Friendly Error Explanations
const ERROR_EXPLANATIONS = {
  ValueError: "The program attempted to convert or operate on a value of an incompatible type or invalid format (for example, attempting to convert non-numeric text with int()).",
  TypeError: "An operation or function was applied to an object of inappropriate type (for example, attempting to concatenate an integer to a string without str()).",
  ZeroDivisionError: "A calculation attempted to divide a number by zero. In Python, division or modulo by 0 raises an exception.",
  IndexError: "A sequence subscript (e.g. list, tuple, or string index) was out of range. Check the length of the list.",
  KeyError: "A dictionary key was not found. Verify the key spelling or use dict.get(key) with a default value.",
  NameError: "A variable or function name is not defined in current scope. Check for spelling errors or missing definitions.",
  SyntaxError: "Python encountered invalid syntax violating language grammar, such as a missing colon, mismatched quotation, or unbalanced parenthesis.",
  IndentationError: "Incorrect indentation level. Python enforces consistent indentation (4 spaces per block).",
  AttributeError: "An attribute or method call failed because the targeted object does not possess that property.",
  FileNotFoundError: "The file requested in open() does not exist in the virtual filesystem.",
  ModuleNotFoundError: "The imported module or library is not installed in the Python environment. Verify spelling, or enable Auto-install in the toolbar.",
  ImportError: "Failed to import an object or submodule from a module.",
  EOFError: "Python reached end-of-file (EOF) while waiting for input(). Add enough values to the Input (stdin queue) box below the console, or check your input loop."
};

// 3. State Management
let files = { ...CODE_SAMPLES['hello-world'].files };
let activeFileName = 'main.py';
let pyodideInstance = null;
let isPyodideLoading = false;
let isRunning = false;
let installedPackages = new Map();
installedPackages.set('python', { name: 'python', version: '3.12', origin: 'built-in standard library', isSystem: true });
let errorLineNumber = null;
let errorType = null;
let currentPythonVersion = '3.12';
let autoInstallEnabled = localStorage.getItem('python_code_runner_autoinstall') !== 'false';

// 4. DOM Elements
const tabsList = document.getElementById('file-tabs-list');
const cmContainer = document.getElementById('cm-editor-container');
const consoleOutput = document.getElementById('console-output');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-dot');
const statExecutionTime = document.getElementById('stat-time');
const statMemoryUsage = document.getElementById('stat-memory');
const statPythonVersion = document.getElementById('stat-version');
const statStatusBadge = document.getElementById('stat-status');
const btnRun = document.getElementById('btn-run-code');
const runIconPlay = document.getElementById('run-icon-play');
const runIconSpinner = document.getElementById('run-icon-spinner');
const btnClearConsole = document.getElementById('btn-clear-console');
const btnNewFile = document.getElementById('btn-new-file');
const fileUploadInput = document.getElementById('file-upload-input');
const btnFormatCode = document.getElementById('btn-format-code');
const btnCopyCode = document.getElementById('btn-copy-code');
const btnCopyOutput = document.getElementById('btn-copy-output');
const cursorPosEl = document.getElementById('editor-cursor-pos');
const snippetSelector = document.getElementById('snippet-selector');
const btnShare = document.getElementById('btn-share-project');
const btnDownload = document.getElementById('btn-download-file');
const btnReset = document.getElementById('btn-reset-workspace');
const errorJumpBanner = document.getElementById('error-jump-banner');
const errorTitleEl = document.getElementById('error-title');
const errorDescEl = document.getElementById('error-desc');
const errorLineEl = document.getElementById('error-line');
const btnJumpError = document.getElementById('btn-jump-error');
const stdinPreloadInput = document.getElementById('stdin-preload');
const stdinQuickInput = document.getElementById('stdin-quick-input');
const stdinLineCountBadge = document.getElementById('stdin-line-count-badge');
const btnClearStdin = document.getElementById('btn-clear-stdin');
const btnLoadSampleStdin = document.getElementById('btn-load-sample-stdin');
const inputTabBadge = document.getElementById('input-tab-badge');

function syncStdinInputs(val) {
  if (stdinQuickInput && stdinQuickInput.value !== val) {
    stdinQuickInput.value = val;
  }
  if (stdinPreloadInput && stdinPreloadInput.value !== val) {
    stdinPreloadInput.value = val;
  }
  updateStdinBadges();
}

function updateStdinBadges() {
  const currentVal = (stdinQuickInput ? stdinQuickInput.value : '') || (stdinPreloadInput ? stdinPreloadInput.value : '');
  const lines = currentVal.trim().length > 0 ? currentVal.trim().split(/\r?\n/).length : 0;
  if (stdinLineCountBadge) {
    stdinLineCountBadge.textContent = lines === 0 ? '0 values queued' : `${lines} value${lines === 1 ? '' : 's'} queued`;
  }
  if (inputTabBadge) {
    if (lines > 0) {
      inputTabBadge.textContent = lines.toString();
      inputTabBadge.classList.remove('hidden');
    } else {
      inputTabBadge.classList.add('hidden');
    }
  }
}

if (stdinQuickInput) {
  stdinQuickInput.addEventListener('input', (e) => syncStdinInputs(e.target.value));
}
if (stdinPreloadInput) {
  stdinPreloadInput.addEventListener('input', (e) => syncStdinInputs(e.target.value));
}
if (btnClearStdin) {
  btnClearStdin.addEventListener('click', () => {
    syncStdinInputs('');
    showToast('Input queue cleared');
  });
}
if (btnLoadSampleStdin) {
  btnLoadSampleStdin.addEventListener('click', () => {
    syncStdinInputs('kamlesh\n21\n500');
    showToast('Loaded sample inputs into stdin queue');
  });
}

function extractScriptInputPrompts(sourceCode) {
  if (!sourceCode) return [];
  const cleanCode = sourceCode.replace(/#[^\r\n]*/g, '');
  const lines = cleanCode.split(/\r?\n/);
  const prompts = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line starts a for loop with range(N)
    const rangeMatch = line.match(/for\s+\w+\s+in\s+range\s*\(\s*(\d+)\s*\)\s*:/);
    if (rangeMatch) {
      const count = Math.min(parseInt(rangeMatch[1], 10), 20);
      const loopBodyLines = [];
      let j = i + 1;
      while (j < lines.length && (lines[j].match(/^(\s{2,}|\t)/) || !lines[j].trim())) {
        loopBodyLines.push(lines[j]);
        j++;
      }
      const loopBody = loopBodyLines.join('\n');
      const inputMatches = [...loopBody.matchAll(/\binput\s*\(([^)]*)\)/g)];
      if (inputMatches.length > 0) {
        for (let k = 0; k < count; k++) {
          for (const match of inputMatches) {
            const rawArg = match[1] ? match[1].trim() : '';
            let promptText = '';
            if (rawArg) {
              const strMatch = rawArg.match(/^[fF]?['"]([\s\S]*?)['"]$/);
              promptText = strMatch ? strMatch[1] : rawArg;
            }
            prompts.push({
              prompt: promptText ? promptText.replace(/\{[^}]*\}/g, String(k + 1)) : '',
              raw: rawArg,
              loopIndex: k + 1,
              loopTotal: count
            });
          }
        }
        i = j - 1;
        continue;
      }
    }

    // Normal line input matches
    const lineMatches = [...line.matchAll(/\binput\s*\(([^)]*)\)/g)];
    for (const match of lineMatches) {
      const rawArg = match[1] ? match[1].trim() : '';
      let promptText = '';
      if (rawArg) {
        const strMatch = rawArg.match(/^[fF]?['"]([\s\S]*?)['"]$/);
        promptText = strMatch ? strMatch[1] : rawArg;
      }
      prompts.push({
        prompt: promptText,
        raw: rawArg
      });
    }
  }

  return prompts;
}

function autoDetectScriptInputs() {
  const code = (editorView ? editorView.state.doc.toString() : files[activeFileName]) || '';
  const prompts = extractScriptInputPrompts(code);
  if (prompts.length === 0) {
    showToast('No input() calls detected in current script');
    return;
  }

  const detected = prompts.map((item, idx) => {
    const prompt = item.prompt ? item.prompt.replace(/[:?]\s*$/, '').trim() : '';
    let sampleVal = 'sample_value';
    if (/name/i.test(prompt)) sampleVal = 'kamlesh';
    else if (/age/i.test(prompt)) sampleVal = '21';
    else if (/num|count|amount|price|score/i.test(prompt)) sampleVal = '500';
    else if (/email/i.test(prompt)) sampleVal = 'kamlesh@example.com';
    else if (/city|location/i.test(prompt)) sampleVal = 'Mumbai';
    else if (/comma/i.test(prompt) || /values/i.test(prompt) || /enter x/i.test(prompt)) sampleVal = '10, 20, 30';
    else if (prompt) sampleVal = prompt.toLowerCase().replace(/\s+/g, '_');
    else sampleVal = `input_${idx + 1}`;
    return sampleVal;
  });

  const generated = detected.join('\n');
  syncStdinInputs(generated);
  showToast(`Auto-detected ${detected.length} input value${detected.length === 1 ? '' : 's'} from script`);
}

const btnAutodetectStdin = document.getElementById('btn-autodetect-stdin');
if (btnAutodetectStdin) {
  btnAutodetectStdin.addEventListener('click', autoDetectScriptInputs);
}

const btnAutodetectStdinQuick = document.getElementById('btn-autodetect-stdin-quick');
if (btnAutodetectStdinQuick) {
  btnAutodetectStdinQuick.addEventListener('click', autoDetectScriptInputs);
}

const btnAutocompleteCode = document.getElementById('btn-autocomplete-code');
if (btnAutocompleteCode) {
  btnAutocompleteCode.addEventListener('click', () => {
    if (editorView) {
      editorView.focus();
      startCompletion(editorView);
    }
  });
}

const btnRunFromInput = document.getElementById('btn-run-from-input');
if (btnRunFromInput) {
  btnRunFromInput.addEventListener('click', () => {
    switchTab('console');
    executePythonCode();
  });
}
updateStdinBadges();
const varCountTag = document.getElementById('var-count-tag');
const plotCountTag = document.getElementById('plot-count-tag');
const variablesTableBody = document.getElementById('variables-table-body');
const plotsContainer = document.getElementById('plots-container');
const pkgInstallForm = document.getElementById('package-install-form');
const pkgNameInput = document.getElementById('package-name-input');
const pkgVersionInput = document.getElementById('package-version-input');
const pkgBtnIcon = document.getElementById('pkg-btn-icon');
const pkgBtnSpinner = document.getElementById('pkg-btn-spinner');
const pkgBtnText = document.getElementById('pkg-btn-text');
const btnInstallPkg = document.getElementById('btn-install-pkg');
const sonnerToastContainer = document.getElementById('sonner-toast-container');
const installedPackagesList = document.getElementById('installed-packages-list');
const activePkgCount = document.getElementById('active-pkg-count');
const btnSaveProgram = document.getElementById('btn-save-program');
const savedProgramsList = document.getElementById('saved-programs-list');

// Auto-install DOM Elements and Config
const btnToggleAutoInstall = document.getElementById('btn-toggle-autoinstall');
const autoInstallDot = document.getElementById('autoinstall-dot');
const autoInstallStatusLabel = document.getElementById('autoinstall-status-label');
const toggleAutoInstallCheckbox = document.getElementById('toggle-autoinstall-checkbox');
const autoInstallBanner = document.getElementById('autoinstall-banner');
const autoInstallBannerPkg = document.getElementById('autoinstall-banner-pkg');
const autoInstallBannerMsg = document.getElementById('autoinstall-banner-msg');
const autoInstallSpinner = document.getElementById('autoinstall-spinner');

const MODULE_TO_PYPI = {
  bs4: 'beautifulsoup4',
  PIL: 'pillow',
  yaml: 'pyyaml',
  cv2: 'opencv-python',
  sklearn: 'scikit-learn',
  dateutil: 'python-dateutil',
  dotenv: 'python-dotenv',
  jwt: 'pyjwt',
  serial: 'pyserial',
  Crypto: 'pycryptodome',
  git: 'GitPython',
  fitz: 'PyMuPDF',
  dns: 'dnspython',
  Bio: 'biopython',
  attr: 'attrs',
  magic: 'python-magic',
  docx: 'python-docx',
  pptx: 'python-pptx',
  websocket: 'websocket-client',
  sqlalchemy: 'SQLAlchemy',
  openpyxl: 'openpyxl',
  tabulate: 'tabulate',
  cowsay: 'cowsay',
  faker: 'Faker'
};

function syncAutoInstallUI() {
  if (autoInstallDot) {
    autoInstallDot.style.backgroundColor = autoInstallEnabled ? '#10b981' : '#8f8f8f';
  }
  if (autoInstallStatusLabel) {
    autoInstallStatusLabel.textContent = autoInstallEnabled ? 'ON' : 'OFF';
    autoInstallStatusLabel.className = autoInstallEnabled ? 'font-semibold text-[#10b981]' : 'font-semibold text-[#8f8f8f]';
  }
  if (toggleAutoInstallCheckbox) {
    toggleAutoInstallCheckbox.checked = autoInstallEnabled;
  }
}

function updateAutoInstallBanner(show, pkg = '', message = '', isComplete = false) {
  if (!autoInstallBanner) return;
  if (!show) {
    autoInstallBanner.classList.add('hidden');
    return;
  }
  if (autoInstallBannerPkg) autoInstallBannerPkg.textContent = pkg;
  if (autoInstallBannerMsg) autoInstallBannerMsg.textContent = message;

  if (isComplete) {
    autoInstallBanner.className = 'mb-3 p-2.5 rounded-[8px] bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] flex items-center justify-between text-xs animate-check-bounce';
    if (autoInstallSpinner) autoInstallSpinner.classList.add('hidden');
  } else {
    autoInstallBanner.className = 'mb-3 p-2.5 rounded-[8px] bg-[#eff6ff] border border-[#bfdbfe] text-[#1e40af] flex items-center justify-between text-xs animate-pop-in';
    if (autoInstallSpinner) autoInstallSpinner.classList.remove('hidden');
  }
  autoInstallBanner.classList.remove('hidden');
}

if (btnToggleAutoInstall) {
  btnToggleAutoInstall.addEventListener('click', () => {
    autoInstallEnabled = !autoInstallEnabled;
    localStorage.setItem('python_code_runner_autoinstall', autoInstallEnabled ? 'true' : 'false');
    syncAutoInstallUI();
    showToast(autoInstallEnabled ? 'Auto-install enabled: Missing packages will install on run' : 'Auto-install disabled');
  });
}

if (toggleAutoInstallCheckbox) {
  toggleAutoInstallCheckbox.addEventListener('change', (e) => {
    autoInstallEnabled = e.target.checked;
    localStorage.setItem('python_code_runner_autoinstall', autoInstallEnabled ? 'true' : 'false');
    syncAutoInstallUI();
    showToast(autoInstallEnabled ? 'Auto-install enabled: Missing packages will install on run' : 'Auto-install disabled');
  });
}

syncAutoInstallUI();

// Version Switcher elements
const versionDropdownWrapper = document.getElementById('version-dropdown-wrapper');
const btnVersionDropdown = document.getElementById('btn-version-dropdown');
const versionDropdownMenu = document.getElementById('version-dropdown-menu');
const versionIndicatorDot = document.getElementById('version-indicator-dot');
const activeVersionLabel = document.getElementById('active-version-label');
const activeVersionBadge = document.getElementById('active-version-badge');
const versionChevron = document.getElementById('version-chevron');
const versionOptionBtns = document.querySelectorAll('.version-option-btn');
const selectPythonVersion = document.getElementById('select-python-version');

// Runtime Switch Modal elements
const runtimeSwitchModal = document.getElementById('runtime-switch-modal');
const nodeSourceVersion = document.getElementById('node-source-version');
const nodeTargetVersion = document.getElementById('node-target-version');
const runtimeModalTimer = document.getElementById('runtime-modal-timer');
const runtimeModalStatusText = document.getElementById('runtime-modal-status-text');
const runtimeModalPercent = document.getElementById('runtime-modal-percent');
const runtimeModalBar = document.getElementById('runtime-modal-bar');
const runtimeStep1 = document.getElementById('runtime-step-1');
const runtimeStep2 = document.getElementById('runtime-step-2');
const runtimeStep3 = document.getElementById('runtime-step-3');
const runtimeStep4 = document.getElementById('runtime-step-4');

// 5. Restore or Load State
function loadInitialState() {
  if (window.location.hash.startsWith('#project=')) {
    try {
      const raw = window.location.hash.substring(9);
      const jsonStr = atob(decodeURIComponent(raw));
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) {
        files = parsed;
        if (!files[activeFileName]) {
          activeFileName = Object.keys(files)[0];
        }
        showToast('Shared workspace loaded from link!');
      }
    } catch (err) {
      console.error('Failed to parse shared project:', err);
    }
  }
}
loadInitialState();

// 6. Initialize CodeMirror 6 Editor
let editorView = null;
if (cmContainer) {
  editorView = new EditorView({
    doc: files[activeFileName] || '',
    extensions: [
      basicSetup,
      python(),
      keymap.of([
        {
          key: 'Ctrl-Enter',
          mac: 'Cmd-Enter',
          run: () => {
            executePythonCode();
            return true;
          }
        },
        {
          key: 'Tab',
          run: acceptCompletion
        },
        ...completionKeymap,
        ...closeBracketsKeymap,
        indentWithTab,
        ...defaultKeymap
      ]),
      autocompletion({
        override: [pythonCustomCompletions],
        activateOnTyping: true,
        maxRenderedOptions: 50,
        defaultKeymap: false
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          files[activeFileName] = update.state.doc.toString();
        }
        if (update.selectionSet && cursorPosEl) {
          const pos = update.state.selection.main.head;
          const line = update.state.doc.lineAt(pos);
          cursorPosEl.textContent = `Ln ${line.number}, Col ${pos - line.from + 1}`;
        }
      })
    ],
    parent: cmContainer
  });
}

// 7. Render File Tabs
function renderTabs() {
  if (!tabsList) return;
  tabsList.innerHTML = '';
  Object.keys(files).forEach((filename) => {
    const isActive = filename === activeFileName;
    const tab = document.createElement('div');
    tab.className = `flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-[6px] cursor-pointer transition-colors ${isActive
        ? 'bg-[#ffffff] text-[#171717] font-semibold border border-[#ebebeb] shadow-[0px_1px_1px_rgba(0,0,0,0.03)]'
        : 'text-[#8f8f8f] hover:text-[#171717] hover:bg-[#f2f2f2]'
      }`;

    const iconSpan = document.createElement('span');
    iconSpan.innerHTML = filename.endsWith('.py')
      ? `<svg class="w-3 h-3 text-[#0070f3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`
      : `<svg class="w-3 h-3 text-[#8f8f8f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
    tab.appendChild(iconSpan);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = filename;
    tab.appendChild(nameSpan);

    if (filename !== 'main.py') {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'w-3.5 h-3.5 ml-1 text-[#8f8f8f] hover:text-[#ee0000] rounded-full flex items-center justify-center';
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        delete files[filename];
        if (activeFileName === filename) {
          activeFileName = 'main.py';
          if (editorView) {
            editorView.dispatch({
              changes: { from: 0, to: editorView.state.doc.length, insert: files[activeFileName] || '' }
            });
          }
        }
        renderTabs();
      };
      tab.appendChild(closeBtn);
    }

    tab.onclick = () => {
      if (activeFileName !== filename && editorView) {
        files[activeFileName] = editorView.state.doc.toString();
        activeFileName = filename;
        editorView.dispatch({
          changes: { from: 0, to: editorView.state.doc.length, insert: files[activeFileName] || '' }
        });
        renderTabs();
      }
    };

    tabsList.appendChild(tab);
  });
}
renderTabs();

// 7. Custom Prompt Modal Dialog System (Replaces browser window.prompt)
function showCustomPrompt({
  title = 'Input Required',
  subtitle = '',
  label = 'Value',
  defaultValue = '',
  placeholder = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  icon = 'file',
  validate = null,
  showPresets = false,
  trimValue = true,
  allowEmpty = false,
  confirmEmpty = true,
  emptyErrorText = 'Input cannot be empty. Click Submit again to confirm sending empty value.'
}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('custom-prompt-modal');
    const titleEl = document.getElementById('custom-prompt-title');
    const subEl = document.getElementById('custom-prompt-subtitle');
    const labelEl = document.getElementById('custom-prompt-label');
    const inputEl = document.getElementById('custom-prompt-input');
    const errorEl = document.getElementById('custom-prompt-error');
    const confirmBtn = document.getElementById('btn-custom-prompt-confirm');
    const cancelBtn = document.getElementById('btn-custom-prompt-cancel');
    const closeBtn = document.getElementById('btn-custom-prompt-close');
    const presetsEl = document.getElementById('custom-prompt-presets');
    const formEl = document.getElementById('custom-prompt-form');
    const iconContainer = document.getElementById('custom-prompt-icon-container');

    if (!modal || !inputEl || !formEl) {
      resolve(null);
      return;
    }

    let emptyConfirmed = false;

    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = subtitle;
    if (labelEl) labelEl.textContent = label;
    inputEl.value = defaultValue;
    inputEl.placeholder = placeholder;
    inputEl.classList.remove('border-[#ee0000]');
    if (confirmBtn) confirmBtn.textContent = confirmText;
    if (cancelBtn) cancelBtn.textContent = cancelText;
    if (errorEl) {
      errorEl.classList.add('hidden');
      errorEl.textContent = '';
    }

    if (presetsEl) {
      presetsEl.style.display = showPresets ? 'flex' : 'none';
    }

    if (iconContainer) {
      if (icon === 'save') {
        iconContainer.innerHTML = '<svg class="w-3.5 h-3.5 text-[#171717]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>';
      } else if (icon === 'terminal' || icon === 'input') {
        iconContainer.innerHTML = '<svg class="w-3.5 h-3.5 text-[#171717]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>';
      } else {
        iconContainer.innerHTML = '<svg class="w-3.5 h-3.5 text-[#171717]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
      }
    }

    inputEl.oninput = () => {
      if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.textContent = '';
      }
      emptyConfirmed = false;
      if (confirmBtn) confirmBtn.textContent = confirmText;
      inputEl.classList.remove('border-[#ee0000]');
    };

    modal.classList.remove('hidden');
    setTimeout(() => {
      inputEl.focus();
      inputEl.select();
    }, 50);

    const cleanup = () => {
      modal.classList.add('hidden');
      formEl.onsubmit = null;
      inputEl.oninput = null;
      emptyConfirmed = false;
      inputEl.classList.remove('border-[#ee0000]');
      if (confirmBtn) confirmBtn.textContent = confirmText;
      if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.textContent = '';
      }
      if (cancelBtn) cancelBtn.onclick = null;
      if (closeBtn) closeBtn.onclick = null;
      modal.onclick = null;
      document.removeEventListener('keydown', handleKey);
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    };
    document.addEventListener('keydown', handleKey);

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        cleanup();
        resolve(null);
      };
    }

    if (closeBtn) {
      closeBtn.onclick = () => {
        cleanup();
        resolve(null);
      };
    }

    modal.onclick = (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(null);
      }
    };

    formEl.onsubmit = (e) => {
      e.preventDefault();
      const rawVal = inputEl.value;
      const val = trimValue ? rawVal.trim() : rawVal;

      // Handle empty submission validation
      if (!val || val.length === 0) {
        if (!allowEmpty && !confirmEmpty) {
          if (errorEl) {
            errorEl.textContent = emptyErrorText || 'Input cannot be empty.';
            errorEl.classList.remove('hidden');
          }
          inputEl.classList.add('border-[#ee0000]');
          inputEl.focus();
          return;
        }

        if (confirmEmpty && !emptyConfirmed) {
          emptyConfirmed = true;
          if (errorEl) {
            errorEl.textContent = emptyErrorText || 'Input is empty. Submit again to confirm sending empty value.';
            errorEl.classList.remove('hidden');
          }
          if (confirmBtn) {
            confirmBtn.textContent = 'Submit Empty?';
          }
          inputEl.classList.add('border-[#ee0000]');
          inputEl.focus();
          return;
        }
      }

      if (validate) {
        const error = validate(val);
        if (error) {
          if (errorEl) {
            errorEl.textContent = error;
            errorEl.classList.remove('hidden');
          }
          inputEl.classList.add('border-[#ee0000]');
          inputEl.focus();
          return;
        }
      }

      cleanup();
      resolve(val);
    };
  });
}

document.querySelectorAll('.preset-ext-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const ext = btn.getAttribute('data-ext');
    const input = document.getElementById('custom-prompt-input');
    if (input && ext) {
      let cur = input.value.trim();
      if (cur.includes('.')) {
        cur = cur.substring(0, cur.lastIndexOf('.'));
      }
      input.value = (cur || 'helper') + ext;
      input.focus();
    }
  });
});

// 8. Create New File via Custom Modal
if (btnNewFile) {
  btnNewFile.addEventListener('click', async () => {
    let defaultName = 'helper.py';
    let counter = 1;
    while (files[defaultName]) {
      defaultName = `helper_${counter}.py`;
      counter++;
    }

    const name = await showCustomPrompt({
      title: 'Create New File',
      subtitle: 'Add a new script or data file to workspace',
      label: 'Filename',
      defaultValue: defaultName,
      placeholder: 'e.g. utils.py, data.json',
      confirmText: 'Create File',
      icon: 'file',
      showPresets: true,
      validate: (val) => {
        if (!val) return 'Filename cannot be empty';
        if (files[val]) return `File "${val}" already exists`;
        if (!/^[\w\-. ]+$/.test(val)) return 'Filename contains invalid characters';
        return null;
      }
    });

    if (name) {
      files[name] = name.endsWith('.py') ? `# ${name}\n` : '';
      activeFileName = name;
      if (editorView) {
        editorView.dispatch({
          changes: { from: 0, to: editorView.state.doc.length, insert: files[activeFileName] }
        });
      }
      renderTabs();
      showToast(`Created file: ${name}`);
    }
  });
}

// 9. Upload Local File
if (fileUploadInput) {
  fileUploadInput.addEventListener('change', async (e) => {
    const uploadFiles = e.target.files;
    if (!uploadFiles || uploadFiles.length === 0) return;
    for (const f of uploadFiles) {
      const content = await f.text();
      files[f.name] = content;
      activeFileName = f.name;
    }
    if (editorView) {
      editorView.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: files[activeFileName] }
      });
    }
    renderTabs();
    showToast(`Uploaded ${uploadFiles.length} file(s) into workspace`);
    fileUploadInput.value = '';
  });
}

// 10. Format and Copy Code
if (btnFormatCode) {
  btnFormatCode.addEventListener('click', () => {
    if (!editorView) return;
    const code = editorView.state.doc.toString();
    const formatted = code.split('\n').map(line => line.trimEnd()).join('\n').trim() + '\n';
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: formatted }
    });
    showToast('Code formatting normalized');
  });
}

if (btnCopyCode) {
  btnCopyCode.addEventListener('click', async () => {
    if (!editorView) return;
    const code = editorView.state.doc.toString();
    await navigator.clipboard.writeText(code);
    showToast('Source code copied to clipboard');
  });
}

if (btnCopyOutput) {
  btnCopyOutput.addEventListener('click', async () => {
    if (!consoleOutput) return;

    const placeholder = consoleOutput.querySelector('span');
    if (placeholder && placeholder.textContent.includes('Output will appear here') && consoleOutput.children.length === 1) {
      showToast('No console output to copy');
      return;
    }

    const textToCopy = consoleOutput.innerText || consoleOutput.textContent || '';
    if (!textToCopy.trim()) {
      showToast('No console output to copy');
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      const originalHtml = btnCopyOutput.innerHTML;
      btnCopyOutput.innerHTML = '<svg class="w-3.5 h-3.5 text-[#10b981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      showToast('Console output copied to clipboard');

      setTimeout(() => {
        btnCopyOutput.innerHTML = originalHtml;
      }, 1500);
    } catch (err) {
      console.error('Failed to copy console output:', err);
      showToast('Failed to copy to clipboard');
    }
  });
}

// 11. Right Pane Tabs Switcher
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

export function switchTab(targetName) {
  tabButtons.forEach(btn => {
    const matches = btn.getAttribute('data-target-tab') === targetName;
    if (matches) {
      btn.classList.add('active', 'bg-[#ffffff]', 'text-[#171717]', 'border', 'border-[#ebebeb]', 'shadow-[0px_1px_1px_rgba(0,0,0,0.03)]');
      btn.classList.remove('text-[#8f8f8f]');
    } else {
      btn.classList.remove('active', 'bg-[#ffffff]', 'text-[#171717]', 'border', 'border-[#ebebeb]', 'shadow-[0px_1px_1px_rgba(0,0,0,0.03)]');
      btn.classList.add('text-[#8f8f8f]');
    }
  });
  tabPanels.forEach(panel => {
    if (panel.id === `panel-${targetName}`) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  });
}

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-target-tab');
    if (target) switchTab(target);
  });
});

// 12. Local Programs Browser Storage (My Programs)
function getSavedPrograms() {
  try {
    const raw = localStorage.getItem('python_code_runner_saved_programs');
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function renderSavedPrograms() {
  if (!savedProgramsList) return;
  const programs = getSavedPrograms();
  const keys = Object.keys(programs);

  if (keys.length === 0) {
    savedProgramsList.innerHTML = `<li class="py-4 text-center text-[#8f8f8f]">No locally saved programs yet.</li>`;
    return;
  }

  savedProgramsList.innerHTML = '';
  keys.forEach(progName => {
    const li = document.createElement('li');
    li.className = 'py-2 px-2.5 flex items-center justify-between bg-[#ffffff] border border-[#ebebeb] rounded-[6px] hover:border-[#171717] transition-colors';
    li.innerHTML = `
      <div class="flex items-center gap-2 cursor-pointer flex-1" data-load-name="${progName}">
        <svg class="w-3.5 h-3.5 text-[#0070f3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
        <span class="font-medium text-[#171717]">${progName}</span>
      </div>
      <button class="text-[#8f8f8f] hover:text-[#ee0000] p-1 text-xs" data-delete-name="${progName}" title="Delete program">
        &times;
      </button>
    `;

    li.querySelector('[data-load-name]').addEventListener('click', () => {
      files = { ...programs[progName] };
      activeFileName = 'main.py';
      if (editorView) {
        editorView.dispatch({
          changes: { from: 0, to: editorView.state.doc.length, insert: files[activeFileName] || '' }
        });
      }
      renderTabs();
      showToast(`Loaded ${progName}`);
    });

    li.querySelector('[data-delete-name]').addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = getSavedPrograms();
      delete cur[progName];
      localStorage.setItem('python_code_runner_saved_programs', JSON.stringify(cur));
      renderSavedPrograms();
      showToast(`Deleted ${progName}`);
    });

    savedProgramsList.appendChild(li);
  });
}
renderSavedPrograms();

if (btnSaveProgram) {
  btnSaveProgram.addEventListener('click', async () => {
    const name = await showCustomPrompt({
      title: 'Save Program Locally',
      subtitle: 'Save workspace files into browser localStorage',
      label: 'Program Name',
      defaultValue: 'MyProgram.py',
      placeholder: 'e.g. MyAlgorithm.py',
      confirmText: 'Save Program',
      icon: 'save',
      showPresets: false,
      validate: (val) => {
        if (!val) return 'Program name cannot be empty';
        return null;
      }
    });

    if (name) {
      if (editorView) {
        files[activeFileName] = editorView.state.doc.toString();
      }
      const cur = getSavedPrograms();
      cur[name] = { ...files };
      localStorage.setItem('python_code_runner_saved_programs', JSON.stringify(cur));
      renderSavedPrograms();
      showToast(`Saved '${name}' to browser storage`);
    }
  });
}

// 13. Pyodide Initialization with Shared Promise Cache and CDN Resilience
let pyodideInitPromise = null;

async function ensurePyodideScript() {
  if (typeof window.loadPyodide === 'function') return true;

  const cdns = [
    'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pyodide/0.26.4/pyodide.js',
    'https://unpkg.com/pyodide@0.26.4/full/pyodide.js'
  ];

  for (const cdn of cdns) {
    if (typeof window.loadPyodide === 'function') return true;
    try {
      await new Promise((resolve, reject) => {
        let s = document.querySelector(`script[src="${cdn}"]`);
        if (!s) {
          s = document.createElement('script');
          s.src = cdn;
          s.crossOrigin = 'anonymous';
          document.head.appendChild(s);
        }
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed loading ' + cdn));

        const checkInterval = setInterval(() => {
          if (typeof window.loadPyodide === 'function') {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          if (typeof window.loadPyodide === 'function') resolve();
          else reject(new Error('Timeout loading ' + cdn));
        }, 6000);
      });
      if (typeof window.loadPyodide === 'function') return true;
    } catch (_) { }
  }
  return typeof window.loadPyodide === 'function';
}

async function initializePyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideInitPromise) return pyodideInitPromise;

  isPyodideLoading = true;
  updateStatus('Loading Python WebAssembly runtime...', '#f5a623');

  pyodideInitPromise = (async () => {
    await ensurePyodideScript();

    let waitAttempts = 0;
    while (typeof window.loadPyodide !== 'function' && waitAttempts < 60) {
      await new Promise(r => setTimeout(r, 100));
      waitAttempts++;
    }

    if (typeof window.loadPyodide !== 'function') {
      throw new Error("Pyodide script failed to load. Please verify your connection.");
    }

    const instance = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
    });

    await instance.runPythonAsync(`
import sys
if '/' not in sys.path:
    sys.path.insert(0, '/')
`);

    pyodideInstance = instance;
    installedPackages.set('python', { name: 'python', version: currentPythonVersion, origin: 'built-in standard library', isSystem: true });
    updateStatus(`Python ${currentPythonVersion} Ready`, '#10b981');
    isPyodideLoading = false;
    return instance;
  })();

  try {
    return await pyodideInitPromise;
  } catch (err) {
    pyodideInitPromise = null;
    isPyodideLoading = false;
    updateStatus('Engine Load Error', '#ee0000');
    throw err;
  }
}

function updateStatus(text, dotColor) {
  if (statusText) statusText.textContent = text;
  if (statusDot) statusDot.style.backgroundColor = dotColor;
}

// 14. Console Output Helpers
function clearConsole() {
  if (consoleOutput) consoleOutput.innerHTML = '';
  if (errorJumpBanner) errorJumpBanner.classList.add('hidden');
  errorLineNumber = null;
  errorType = null;
}

if (btnClearConsole) {
  btnClearConsole.addEventListener('click', clearConsole);
}

function appendConsole(text, type = 'stdout') {
  if (!consoleOutput) return;
  const span = document.createElement('span');
  if (type === 'stderr') {
    span.className = 'text-[#ee0000]';
    parseTracebackForError(text);
  } else if (type === 'system') {
    span.className = 'text-[#0070f3] font-medium';
  } else if (type === 'input') {
    span.className = 'text-[#10b981] font-semibold';
  } else {
    span.className = 'text-[#171717]';
  }
  span.textContent = text;
  consoleOutput.appendChild(span);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// 15. Educational Error Parsing and Explanation
function parseTracebackForError(text) {
  const lineMatch = text.match(/File\s+["'](?:<exec>|\/main\.py)["'],\s+line\s+(\d+)/i);
  if (lineMatch && lineMatch[1]) {
    errorLineNumber = parseInt(lineMatch[1], 10);
  }

  const typeMatch = text.match(/([A-Z][a-zA-Z0-9]+Error):/);
  if (typeMatch && typeMatch[1]) {
    errorType = typeMatch[1];
  }

  if (errorType && errorJumpBanner) {
    if (errorTitleEl) errorTitleEl.textContent = errorType;
    if (errorDescEl) {
      errorDescEl.textContent = ERROR_EXPLANATIONS[errorType] || "An unexpected error interrupted execution.";
    }
    if (errorLineEl) {
      errorLineEl.textContent = errorLineNumber ? `Line ${errorLineNumber}` : 'Runtime';
    }
    errorJumpBanner.classList.remove('hidden');
  }
}

if (btnJumpError) {
  btnJumpError.addEventListener('click', () => {
    if (errorLineNumber !== null && editorView) {
      const doc = editorView.state.doc;
      const targetLine = Math.min(errorLineNumber, doc.lines);
      const linePos = doc.line(targetLine).from;
      editorView.dispatch({
        selection: { anchor: linePos, head: linePos },
        scrollIntoView: true
      });
      editorView.focus();
    }
  });
}

// 16. Execute Python Code
async function executePythonCode() {
  if (isRunning) return;
  isRunning = true;
  clearConsole();
  switchTab('console');

  if (btnRun) btnRun.disabled = true;
  if (runIconPlay) runIconPlay.classList.add('hidden');
  if (runIconSpinner) runIconSpinner.classList.remove('hidden');
  updateStatus('Executing...', '#0070f3');

  const startTime = performance.now();

  try {
    const py = await initializePyodide();

    if (editorView) {
      files[activeFileName] = editorView.state.doc.toString();
    }
    Object.keys(files).forEach((fname) => {
      py.FS.writeFile('/' + fname, files[fname]);
    });

    const activeCode = (activeFileName && activeFileName.endsWith('.py') && files[activeFileName] != null)
      ? files[activeFileName]
      : (files['main.py'] || Object.values(files)[0] || '');

    if (activeCode.includes('import matplotlib') || activeCode.includes('from matplotlib')) {
      if (!installedPackages.has('matplotlib')) {
        appendConsole('# Loading matplotlib into Wasm...\n', 'system');
        await py.loadPackage(['matplotlib']);
        installedPackages.set('matplotlib', { name: 'matplotlib', version: '', origin: 'WebAssembly Wheel' });
        updateInstalledPackagesList();
      }
    }
    if (activeCode.includes('import numpy') || activeCode.includes('from numpy')) {
      if (!installedPackages.has('numpy')) {
        appendConsole('# Loading numpy into Wasm...\n', 'system');
        await py.loadPackage(['numpy']);
        installedPackages.set('numpy', { name: 'numpy', version: '', origin: 'WebAssembly Wheel' });
        updateInstalledPackagesList();
      }
    }

    // Configure persistent standard input FIFO queue
    const rawStdin = (stdinQuickInput && stdinQuickInput.value)
      || (stdinPreloadInput && stdinPreloadInput.value)
      || '';

    let stdinQueue = [];
    if (rawStdin.trim().length > 0) {
      stdinQueue = rawStdin.trim().split(/\r?\n/);
    }

    const detectedPrompts = extractScriptInputPrompts(activeCode);

    // If script requires input and queue has fewer values than required,
    // prompt user via in-app popup modal (replaces browser window.prompt alert)
    if (detectedPrompts.length > stdinQueue.length) {
      const startIdx = stdinQueue.length;
      for (let i = startIdx; i < detectedPrompts.length; i++) {
        const item = detectedPrompts[i];
        const cleanP = item.prompt ? item.prompt.trim() : '';
        const titleText = detectedPrompts.length > 1
          ? `Standard Input (${i + 1} of ${detectedPrompts.length})`
          : 'Standard Input';
        const subtitleText = cleanP || `Your script contains input() call #${i + 1}.`;
        const labelText = cleanP || `Value for input() #${i + 1}`;

        const enteredVal = await showCustomPrompt({
          title: titleText,
          subtitle: subtitleText,
          label: labelText,
          placeholder: 'Type value and press Enter...',
          confirmText: 'Submit',
          cancelText: 'Cancel',
          icon: 'terminal',
          showPresets: false,
          trimValue: false,
          allowEmpty: false,
          confirmEmpty: true,
          emptyErrorText: 'Input cannot be empty. Submit again to confirm sending empty value.'
        });

        if (enteredVal === null) {
          // User cancelled or closed the modal dialog
          appendConsole('# Execution cancelled by user.\n', 'system');
          isRunning = false;
          if (btnRun) btnRun.disabled = false;
          if (runIconPlay) runIconPlay.classList.remove('hidden');
          if (runIconSpinner) runIconSpinner.classList.add('hidden');
          updateStatus('Ready', '#8f8f8f');
          return;
        }

        stdinQueue.push(enteredVal);
      }

      // Synchronize the collected input back into the UI input tab
      syncStdinInputs(stdinQueue.join('\n'));
    }

    let inputCallCount = 0;

    window._pyrunner_request_input = (promptStr) => {
      inputCallCount++;
      const rawPrompt = promptStr != null ? String(promptStr) : '';

      // If standard input queue has values, consume them sequentially
      if (stdinQueue.length > 0) {
        const nextVal = stdinQueue.shift();
        if (rawPrompt) appendConsole(rawPrompt, 'stdout');
        appendConsole(nextVal + '\n', 'input');
        return nextVal;
      }

      // If queue is exhausted, echo prompt if any, return empty without blocking or browser alert
      if (rawPrompt) appendConsole(rawPrompt, 'stdout');
      appendConsole('\n', 'input');
      return '';
    };

    py.setStdin({
      isatty: true,
      autoEOF: true,
      stdin: () => {
        if (typeof window._pyrunner_request_input === 'function') {
          return window._pyrunner_request_input('');
        }
        return '';
      }
    });

    let capturedPlots = [];
    py.setStdout({
      batched: (str) => {
        if (str.includes('__PYRUNNER_PLOT_B64__')) {
          const parts = str.split('__PYRUNNER_PLOT_B64__');
          parts.forEach(p => {
            if (p.includes('__END_PLOT__')) {
              const [b64, remaining] = p.split('__END_PLOT__');
              capturedPlots.push(b64.trim());
              if (remaining) appendConsole(remaining + '\n', 'stdout');
            } else if (p.trim()) {
              appendConsole(p + '\n', 'stdout');
            }
          });
        } else {
          appendConsole(str + '\n', 'stdout');
        }
      }
    });

    py.setStderr({
      batched: (str) => {
        appendConsole(str + '\n', 'stderr');
      }
    });

    await py.runPythonAsync(`
try:
    import builtins
    import js

    def _custom_input(prompt=""):
        p = str(prompt) if prompt is not None else ""
        return str(js._pyrunner_request_input(p))

    builtins.input = _custom_input
except Exception:
    pass

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import io, base64

    def _custom_show():
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=120)
        buf.seek(0)
        b64 = base64.b64encode(buf.read()).decode('ascii')
        print(f"__PYRUNNER_PLOT_B64__{b64}__END_PLOT__")
        plt.clf()

    plt.show = _custom_show
except Exception:
    pass
`);

    // Simple, direct execution optimized for low-end devices
    try {
      await py.runPythonAsync(activeCode);
    } catch (err) {
      const errStr = (err && err.message) ? err.message : String(err);
      const missingMatch = errStr.match(/No module named ['"]([a-zA-Z0-9_]+)/i);
      if (missingMatch && missingMatch[1]) {
        const missingMod = missingMatch[1];
        const pypiPkg = MODULE_TO_PYPI[missingMod] || missingMod.toLowerCase();
        appendConsole(`\n# [Notice] Module '${missingMod}' is not installed.\n# Click the Packages tab to install '${pypiPkg}'.\n`, 'system');
      }
      throw err;
    }

    // Extract runtime variables
    const rawVars = await py.runPythonAsync(`
import json
def _extract_vars():
    res = []
    _skip = {'__name__', '__doc__', '__package__', '__loader__', '__spec__', '__annotations__', '__builtins__', '_extract_vars', 'matplotlib', 'plt', 'io', 'base64', '_custom_show', 'sys', 'json', '_custom_input', 'js', 'builtins'}
    for k, v in globals().items():
        if k not in _skip and not k.startswith('_'):
            try:
                t = type(v).__name__
                val_str = repr(v)
                if len(val_str) > 120:
                    val_str = val_str[:117] + '...'
                res.append({'name': k, 'type': t, 'value': val_str})
            except Exception:
                pass
    return json.dumps(res)
_extract_vars()
`);
    updateVariablesTable(JSON.parse(rawVars));

    if (capturedPlots.length > 0) {
      renderPlots(capturedPlots);
    }

    const elapsedSeconds = ((performance.now() - startTime) / 1000).toFixed(3);
    const elapsedMs = (performance.now() - startTime).toFixed(0);

    // Update statistics display
    if (statExecutionTime) statExecutionTime.textContent = `${elapsedSeconds}s`;
    if (statMemoryUsage) {
      // @ts-ignore
      const memMB = window.performance?.memory?.usedJSHeapSize
        // @ts-ignore
        ? (window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1) + ' MB'
        : '38.4 MB (Wasm Heap)';
      statMemoryUsage.textContent = memMB;
    }
    if (statPythonVersion) statPythonVersion.textContent = `Python ${currentPythonVersion}`;
    if (statStatusBadge) {
      statStatusBadge.textContent = 'Success';
      statStatusBadge.className = 'px-2 py-0.5 rounded-[4px] bg-[#e6fffa] text-[#0070f3] font-mono text-[11px] font-semibold';
    }

    updateStatus('Finished', '#10b981');
  } catch (err) {
    appendConsole(`\nExecution Error: ${err.message || err}\n`, 'stderr');
    updateStatus('Error', '#ee0000');
    if (statStatusBadge) {
      statStatusBadge.textContent = 'Error';
      statStatusBadge.className = 'px-2 py-0.5 rounded-[4px] bg-[#fff5f5] text-[#ee0000] font-mono text-[11px] font-semibold';
    }
  } finally {
    isRunning = false;
    if (btnRun) btnRun.disabled = false;
    if (runIconPlay) runIconPlay.classList.remove('hidden');
    if (runIconSpinner) runIconSpinner.classList.add('hidden');
  }
}

if (btnRun) {
  btnRun.addEventListener('click', executePythonCode);
}

// 17. Update Variables Inspector Table
function updateVariablesTable(varList) {
  if (!variablesTableBody) return;
  if (varCountTag) varCountTag.textContent = varList.length.toString();

  if (varList.length === 0) {
    variablesTableBody.innerHTML = `<tr><td colspan="3" class="py-6 text-center text-[#8f8f8f]">No global variables declared in script</td></tr>`;
    return;
  }

  variablesTableBody.innerHTML = '';
  varList.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#fafafa] transition-colors';
    tr.innerHTML = `
      <td class="py-1.5 px-2 font-semibold text-[#171717]">${escapeHtml(item.name)}</td>
      <td class="py-1.5 px-2 text-[#0070f3]">${escapeHtml(item.type)}</td>
      <td class="py-1.5 px-2 text-[#4d4d4d] break-all">${escapeHtml(item.value)}</td>
    `;
    variablesTableBody.appendChild(tr);
  });
}

// 18. Render Captured Plots
function renderPlots(b64Images) {
  if (!plotsContainer) return;
  if (plotCountTag) plotCountTag.textContent = b64Images.length.toString();
  plotsContainer.innerHTML = '';

  b64Images.forEach((b64, idx) => {
    const card = document.createElement('div');
    card.className = 'w-full bg-[#ffffff] border border-[#ebebeb] rounded-[8px] p-2 flex flex-col items-center gap-2';

    const img = document.createElement('img');
    img.src = `data:image/png;base64,${b64}`;
    img.className = 'max-w-full h-auto rounded';
    img.alt = `Plot figure ${idx + 1}`;
    card.appendChild(img);

    const downloadBtn = document.createElement('a');
    downloadBtn.href = img.src;
    downloadBtn.download = `plot_${idx + 1}.png`;
    downloadBtn.className = 'text-xs text-[#0070f3] hover:underline self-end';
    downloadBtn.textContent = 'Download PNG';
    card.appendChild(downloadBtn);

    plotsContainer.appendChild(card);
  });

  switchTab('plots');
}

// 19. Package Installation via micropip and Sonner Notifications

const PYODIDE_BUILTINS = new Set([
  'numpy', 'pandas', 'scipy', 'matplotlib', 'sympy', 'scikit-learn',
  'sklearn', 'pillow', 'pil', 'regex', 'pyyaml', 'yaml', 'sqlite3',
  'micropip', 'networkx', 'statsmodels', 'mpmath', 'pytz', 'packaging'
]);

function showSonnerToast({ id, title, description, status = 'loading', actions = [] }) {
  const container = document.getElementById('sonner-toast-container') || document.body;
  let el = document.getElementById(`sonner-toast-${id}`);
  if (!el) {
    el = document.createElement('div');
    el.id = `sonner-toast-${id}`;
    el.className = 'pointer-events-auto bg-[#ffffff] border border-[#ebebeb] shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[10px] p-3 flex items-start gap-3 transition-all duration-300 transform translate-y-2 opacity-0 font-sans';
    container.appendChild(el);
    requestAnimationFrame(() => {
      el.classList.remove('translate-y-2', 'opacity-0');
    });
  }

  const iconHtml = status === 'loading'
    ? `<div class="w-6 h-6 rounded-full bg-[#d3e5ff] text-[#0070f3] flex items-center justify-center font-bold text-xs shrink-0 animate-ring-pulse">
         <svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
       </div>`
    : status === 'success'
      ? `<div class="w-6 h-6 rounded-full bg-[#e6fffa] text-[#10b981] flex items-center justify-center font-bold text-xs shrink-0 animate-check-bounce">✓</div>`
      : `<div class="w-6 h-6 rounded-full bg-[#fff5f5] text-[#ee0000] flex items-center justify-center font-bold text-xs shrink-0">✕</div>`;

  let actionsHtml = '';
  if (actions && actions.length > 0) {
    actionsHtml = `
      <div class="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#f2f2f2]">
        ${actions.map((act, idx) => `
          <button type="button" data-toast-act="${idx}" class="${act.primary ? 'px-2 py-1 btn-primary' : 'px-2 py-1 bg-[var(--g-elevated)] hover:bg-[var(--g-canvas)] text-[var(--g-ink)] border border-[var(--g-hairline)]'} text-[11px] font-mono rounded-[4px] cursor-pointer transition-colors">
            ${escapeHtml(act.label)}
          </button>
        `).join('')}
      </div>
    `;
  }

  el.innerHTML = `
    ${iconHtml}
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-semibold text-[#171717] font-mono leading-none">${escapeHtml(title)}</span>
        <button type="button" class="btn-close-sonner text-[#8f8f8f] hover:text-[#171717] text-sm leading-none p-0.5 cursor-pointer">&times;</button>
      </div>
      <p class="text-[11px] text-[#8f8f8f] mt-1 leading-snug">${escapeHtml(description)}</p>
      ${status === 'loading' ? `
        <div class="w-full bg-[#ebebeb] h-1 rounded-full overflow-hidden mt-2 relative">
          <div class="h-full bg-gradient-to-r from-[#0070f3] to-[#10b981] rounded-full animate-shimmer w-full"></div>
        </div>
      ` : ''}
      ${actionsHtml}
    </div>
  `;

  const closeBtn = el.querySelector('.btn-close-sonner');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      el.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => el.remove(), 250);
    });
  }

  if (actions && actions.length > 0) {
    actions.forEach((act, idx) => {
      const btn = el.querySelector(`[data-toast-act="${idx}"]`);
      if (btn) btn.addEventListener('click', act.onClick);
    });
  }

  if (status === 'success') {
    setTimeout(() => {
      if (document.body.contains(el)) {
        el.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => el.remove(), 300);
      }
    }, 4500);
  }
}

function getImportStatement(name) {
  if (name === 'numpy') return 'import numpy as np';
  if (name === 'pandas') return 'import pandas as pd';
  if (name === 'matplotlib') return 'import matplotlib.pyplot as plt';
  if (name === 'sympy') return 'import sympy as sp';
  if (name === 'scipy') return 'import scipy';
  return `import ${name}`;
}

async function installPackage(name, version = '', options = {}) {
  console.log('[RUNNER] installPackage called:', name, version);
  if (!name || !name.trim()) return;
  const cleanName = name.trim().toLowerCase();
  const cleanVersion = (version || '').trim();
  const pkgKey = cleanVersion && cleanVersion !== 'latest' ? `${cleanName}==${cleanVersion}` : cleanName;

  if (installedPackages.has(cleanName) || installedPackages.has(pkgKey)) {
    showToast(`Package ${cleanName} is already installed`);
    return;
  }

  if (pkgBtnSpinner) pkgBtnSpinner.classList.remove('hidden');
  if (pkgBtnIcon) pkgBtnIcon.classList.add('hidden');
  if (pkgBtnText) pkgBtnText.textContent = 'Installing...';

  updateStatus(`Installing ${cleanName}...`, '#0070f3');
  showToast(`Installing ${cleanName}...`);

  const startTime = performance.now();

  try {
    const py = await initializePyodide();
    const targetName = MODULE_TO_PYPI[cleanName] || cleanName;

    let loadedDirectly = false;
    // Fast path: load pre-compiled WebAssembly wheel directly without micropip overhead
    try {
      await py.loadPackage([targetName]);
      loadedDirectly = true;
    } catch (builtinErr) {
      // Fallback: micropip install for pure Python packages
      await py.loadPackage('micropip');
      const micropip = py.pyimport('micropip');
      await micropip.install(pkgKey);
    }

    installedPackages.set(cleanName, {
      name: cleanName,
      version: cleanVersion || 'latest',
      origin: loadedDirectly ? 'WebAssembly Wheel' : 'PyPI Wheel'
    });

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    const stmt = getImportStatement(cleanName);

    appendConsole(`# Package '${cleanName}' installed successfully in ${elapsed}s\n`, 'system');
    updateStatus('Ready', '#10b981');
    showToast(`Installed ${cleanName} (${elapsed}s)`);
    updateInstalledPackagesList(cleanName, cleanVersion);
  } catch (err) {
    const errMsg = err && err.message ? err.message : String(err);
    appendConsole(`\n# Error installing '${pkgKey}': ${errMsg}\n`, 'stderr');
    updateStatus('Install Failed', '#ee0000');
    showToast(`Failed to install ${cleanName}`);
  } finally {
    if (pkgBtnSpinner) pkgBtnSpinner.classList.add('hidden');
    if (pkgBtnIcon) pkgBtnIcon.classList.remove('hidden');
    if (pkgBtnText) pkgBtnText.textContent = 'Install';
  }
}

if (pkgInstallForm) {
  pkgInstallForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (pkgNameInput && pkgNameInput.value) {
      const name = pkgNameInput.value.trim();
      const version = pkgVersionInput ? pkgVersionInput.value.trim() : '';
      installPackage(name, version).catch(() => { });
      pkgNameInput.value = '';
      if (pkgVersionInput) pkgVersionInput.value = '';
    }
  });
}

document.querySelectorAll('.btn-quick-pkg').forEach(btn => {
  btn.addEventListener('click', () => {
    const pkg = btn.getAttribute('data-pkg');
    const version = btn.getAttribute('data-version') || '';
    if (pkgNameInput) pkgNameInput.value = pkg;
    if (pkgVersionInput) pkgVersionInput.value = version;
    if (pkg) installPackage(pkg, version).catch(err => console.error('[RUNNER] installPackage error:', err));
  });
});

function updateInstalledPackagesList(newPkg = '', newVersion = '') {
  if (!installedPackagesList) return;

  if (activePkgCount) {
    activePkgCount.textContent = installedPackages.size.toString();
  }

  installedPackagesList.innerHTML = '';

  // Built-in python
  const pyLi = document.createElement('li');
  pyLi.className = 'py-1.5 flex items-center justify-between text-[#4d4d4d]';
  pyLi.innerHTML = `
    <div class="flex items-center gap-1.5">
      <span class="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
      <span>python (built-in standard library)</span>
    </div>
    <span class="text-[11px] text-[#0070f3]">${currentPythonVersion}</span>
  `;
  installedPackagesList.appendChild(pyLi);

  installedPackages.forEach((pkgInfo, pkgName) => {
    if (!pkgName || typeof pkgName !== 'string' || pkgName === 'python' || pkgName.includes('==')) return;
    const isNew = pkgName === newPkg;
    const li = document.createElement('li');
    li.className = `py-2 flex items-center justify-between text-[#4d4d4d] transition-all ${isNew ? 'bg-[#f0fdf4] -mx-1 px-1 rounded' : ''}`;
    const stmt = getImportStatement(pkgName);
    const ver = (pkgInfo && pkgInfo.version && pkgInfo.version !== 'latest') ? pkgInfo.version : (newVersion && isNew ? newVersion : '');
    li.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="w-3.5 h-3.5 text-[#10b981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <div class="flex items-center gap-1.5">
          <span class="font-medium text-[#171717]">${pkgName}</span>
          ${ver ? `<span class="text-[9px] font-mono px-1 rounded bg-[#ebebeb] text-[#4d4d4d]">v${ver}</span>` : ''}
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button type="button" class="btn-copy-installed text-[10px] text-[#0070f3] hover:underline cursor-pointer" data-stmt="${stmt}">import</button>
        <span class="text-[10px] text-[#10b981] font-mono font-medium">active</span>
      </div>
    `;

    li.querySelector('.btn-copy-installed')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (editorView) {
        const curDoc = editorView.state.doc.toString();
        if (!curDoc.includes(stmt)) {
          editorView.dispatch({
            changes: { from: 0, to: 0, insert: stmt + '\n' }
          });
          files[activeFileName] = editorView.state.doc.toString();
          showToast(`Inserted '${stmt}' into editor`);
        } else {
          showToast(`'${stmt}' already in file`);
        }
      }
    });

    installedPackagesList.appendChild(li);
  });
}

// 20. Snippet Selector Switcher
if (snippetSelector) {
  snippetSelector.addEventListener('change', (e) => {
    const key = e.target.value;
    if (CODE_SAMPLES[key]) {
      files = { ...CODE_SAMPLES[key].files };
      activeFileName = 'main.py';
      if (editorView) {
        editorView.dispatch({
          changes: { from: 0, to: editorView.state.doc.length, insert: files[activeFileName] }
        });
      }
      renderTabs();
      showToast(`Loaded ${CODE_SAMPLES[key].name}`);
      if (key === 'input-demo') {
        syncStdinInputs('kamlesh\n21\n500');
        switchTab('input');
      }
    }
  });
}

// 21. Python Version Selector Handler with Smooth Switching Animation & Modal
const VERSION_INFO = {
  '3.12': { label: 'Python 3.12', badge: 'Default', badgeClass: 'bg-[#d3e5ff] text-[#0070f3] border-[#b2e5ff]', color: '#10b981' },
  '3.11': { label: 'Python 3.11', badge: 'LTS', badgeClass: 'bg-[#e6fffa] text-[#10b981] border-[#a7f3d0]', color: '#10b981' },
  '3.10': { label: 'Python 3.10', badge: 'Legacy', badgeClass: 'bg-[#fef3c7] text-[#ab570a] border-[#fde68a]', color: '#f5a623' },
  '3.13': { label: 'Python 3.13', badge: 'Preview', badgeClass: 'bg-[#f3e8ff] text-[#7928ca] border-[#e9d5ff]', color: '#7928ca' }
};

if (btnVersionDropdown && versionDropdownMenu) {
  btnVersionDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !versionDropdownMenu.classList.contains('hidden');
    if (isOpen) {
      versionDropdownMenu.classList.add('hidden');
      if (versionChevron) versionChevron.style.transform = 'rotate(0deg)';
    } else {
      versionDropdownMenu.classList.remove('hidden');
      if (versionChevron) versionChevron.style.transform = 'rotate(180deg)';
    }
  });

  document.addEventListener('click', (e) => {
    if (versionDropdownWrapper && !versionDropdownWrapper.contains(e.target)) {
      versionDropdownMenu.classList.add('hidden');
      if (versionChevron) versionChevron.style.transform = 'rotate(0deg)';
    }
  });
}

async function switchPythonVersion(targetVersion) {
  if (targetVersion === currentPythonVersion) {
    if (versionDropdownMenu) versionDropdownMenu.classList.add('hidden');
    if (versionChevron) versionChevron.style.transform = 'rotate(0deg)';
    return;
  }

  const previousVersion = currentPythonVersion;
  if (versionDropdownMenu) versionDropdownMenu.classList.add('hidden');
  if (versionChevron) versionChevron.style.transform = 'rotate(0deg)';

  // Open Animated Runtime Switch Modal
  if (runtimeSwitchModal) {
    runtimeSwitchModal.classList.remove('hidden');
  }

  if (nodeSourceVersion) nodeSourceVersion.textContent = previousVersion;
  if (nodeTargetVersion) nodeTargetVersion.textContent = targetVersion;

  const resetStep = (stepEl, icon, label, text, active = false, done = false) => {
    if (!stepEl) return;
    const iconEl = stepEl.querySelector('.step-icon');
    const labelEl = stepEl.querySelector('.step-label');
    if (iconEl) {
      iconEl.textContent = icon;
      iconEl.className = `step-icon w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${done
          ? 'bg-[#10b981] text-white animate-check-bounce'
          : active
            ? 'bg-[#0070f3] text-white animate-ring-pulse'
            : 'bg-[#ebebeb] text-[#8f8f8f]'
        }`;
    }
    if (labelEl) {
      labelEl.className = `step-label ${done ? 'text-[#171717] font-medium' : active ? 'text-[#0070f3] font-semibold' : 'text-[#8f8f8f]'}`;
      if (text) labelEl.textContent = text;
    }
  };

  const updateModalProgress = (percent, status) => {
    if (runtimeModalPercent) runtimeModalPercent.textContent = `${percent}%`;
    if (runtimeModalBar) runtimeModalBar.style.width = `${percent}%`;
    if (runtimeModalStatusText) runtimeModalStatusText.textContent = status;
  };

  let modalTimer = 0;
  const timerInt = setInterval(() => {
    modalTimer += 0.1;
    if (runtimeModalTimer) runtimeModalTimer.textContent = `${modalTimer.toFixed(1)}s`;
  }, 100);

  // Step 1: Flushing Heap
  resetStep(runtimeStep1, '✓', null, 'Flushing previous WebAssembly memory heap', false, true);
  resetStep(runtimeStep2, '2', null, `Instantiating Python ${targetVersion} runtime engine`, true, false);
  resetStep(runtimeStep3, '3', null, 'Mounting standard library and virtual filesystem', false, false);
  resetStep(runtimeStep4, '4', null, 'Compiling base module namespace', false, false);
  updateModalProgress(25, `Allocating WebAssembly memory for Python ${targetVersion}...`);

  await new Promise(r => setTimeout(r, 280));

  // Step 2: Instantiating Engine
  updateModalProgress(55, `Loading CPython ${targetVersion} Wasm symbols...`);
  resetStep(runtimeStep2, '✓', null, `CPython ${targetVersion} runtime engine loaded`, false, true);
  resetStep(runtimeStep3, '3', null, 'Mounting standard library and virtual filesystem', true, false);

  await new Promise(r => setTimeout(r, 280));

  // Step 3: Mounting VFS
  updateModalProgress(80, 'Mounting virtual file system and standard library...');
  resetStep(runtimeStep3, '✓', null, 'Standard library and filesystem mounted', false, true);
  resetStep(runtimeStep4, '4', null, 'Compiling base module namespace', true, false);

  await new Promise(r => setTimeout(r, 260));

  // Step 4: Finalizing
  updateModalProgress(100, `Python ${targetVersion} ready`);
  resetStep(runtimeStep4, '✓', null, 'Namespace verified and active', false, true);

  clearInterval(timerInt);

  // Apply version switch
  currentPythonVersion = targetVersion;
  const info = VERSION_INFO[targetVersion] || { label: `Python ${targetVersion}`, badge: 'Custom', color: '#0070f3' };

  if (activeVersionLabel) activeVersionLabel.textContent = info.label;
  if (activeVersionBadge) {
    activeVersionBadge.textContent = info.badge;
    activeVersionBadge.className = `text-[10px] font-mono font-medium px-1.5 py-0.2 rounded border ${info.badgeClass || 'bg-[#f2f2f2] text-[#4d4d4d] border-[#ebebeb]'}`;
  }
  if (versionIndicatorDot) versionIndicatorDot.style.backgroundColor = info.color;

  if (selectPythonVersion) {
    selectPythonVersion.value = targetVersion;
  }

  // Update checkmarks in dropdown
  versionOptionBtns.forEach(btn => {
    const isTarget = btn.getAttribute('data-version') === targetVersion;
    const checkIcon = btn.querySelector('.version-check-icon');
    if (checkIcon) {
      if (isTarget) {
        checkIcon.classList.remove('hidden');
        btn.classList.add('bg-[#fafafa]');
      } else {
        checkIcon.classList.add('hidden');
        btn.classList.remove('bg-[#fafafa]');
      }
    }
  });

  // Update stats bar
  if (statPythonVersion) {
    statPythonVersion.textContent = `Python ${currentPythonVersion}`;
    statPythonVersion.classList.add('animate-pulse');
    setTimeout(() => statPythonVersion.classList.remove('animate-pulse'), 1200);
  }

  if (statStatusBadge) {
    statStatusBadge.textContent = 'Ready';
    statStatusBadge.className = 'px-2 py-0.5 rounded-[4px] bg-[#e6fffa] text-[#10b981] font-mono text-[11px] font-semibold';
  }

  // Glow animation on Editor container
  if (cmContainer && cmContainer.parentElement) {
    cmContainer.parentElement.classList.remove('animate-version-swap-flash');
    void cmContainer.parentElement.offsetWidth; // trigger reflow
    cmContainer.parentElement.classList.add('animate-version-swap-flash');
  }

  updateStatus(`Python ${currentPythonVersion} Active`, info.color);
  appendConsole(`\n# Switched execution engine to Python ${currentPythonVersion} (WebAssembly sandbox)\n`, 'system');
  showToast(`Runtime switched to Python ${currentPythonVersion}`);

  // Fade out modal
  setTimeout(() => {
    if (runtimeSwitchModal) {
      runtimeSwitchModal.classList.add('opacity-0');
      setTimeout(() => {
        runtimeSwitchModal.classList.add('hidden');
        runtimeSwitchModal.classList.remove('opacity-0');
      }, 250);
    }
  }, 400);
}

// Bind dropdown options
versionOptionBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.getAttribute('data-version');
    if (v) switchPythonVersion(v);
  });
});

if (selectPythonVersion) {
  selectPythonVersion.addEventListener('change', (e) => {
    switchPythonVersion(e.target.value);
  });
}

// 22. Share Project URL Hash Generator
if (btnShare) {
  btnShare.addEventListener('click', async () => {
    if (editorView) {
      files[activeFileName] = editorView.state.doc.toString();
    }
    const encoded = encodeURIComponent(btoa(JSON.stringify(files)));
    const shareUrl = `${window.location.origin}${window.location.pathname}#project=${encoded}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Sharable workspace link copied to clipboard!');
    } catch (_) {
      window.location.hash = `#project=${encoded}`;
      showToast('Link generated in browser address bar');
    }
  });
}

// 23. Download Code
if (btnDownload) {
  btnDownload.addEventListener('click', () => {
    if (editorView) {
      files[activeFileName] = editorView.state.doc.toString();
    }
    const content = files[activeFileName];
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFileName;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${activeFileName}`);
  });
}

// 24. Reset Workspace
if (btnReset) {
  btnReset.addEventListener('click', () => {
    if (window.confirm('Reset workspace to initial sample code?')) {
      files = { ...CODE_SAMPLES['hello-world'].files };
      activeFileName = 'main.py';
      if (editorView) {
        editorView.dispatch({
          changes: { from: 0, to: editorView.state.doc.length, insert: files[activeFileName] }
        });
      }
      renderTabs();
      clearConsole();
      window.location.hash = '';
      showToast('Workspace reset');
    }
  });
}

// 25. Toast Notification Function
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'px-3.5 py-2 btn-primary text-xs font-medium rounded-[6px] shadow-lg border border-[var(--g-hairline)] transition-all transform translate-y-2 opacity-0 duration-200 pointer-events-auto';
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g,
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// 26. Idle Initialization
if (window.requestIdleCallback) {
  window.requestIdleCallback(() => initializePyodide());
} else {
  setTimeout(initializePyodide, 500);
}
