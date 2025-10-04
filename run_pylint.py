
import os
import subprocess

def run_pylint():
    """Runs pylint on all Python files in the project."""
    for root, _, files in os.walk("."):
        if ".claude" in root:
            continue
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                if "tests" in file_path:
                    continue
                print(f"Running pylint on {file_path}")
                subprocess.run(["pylint", "--rcfile=.pylintrc", file_path], check=False)

if __name__ == "__main__":
    run_pylint()
