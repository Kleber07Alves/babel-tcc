using System.Diagnostics;

namespace MultiLingualCode.Core.Tests.LanguageAdapters;

/// <summary>
/// A custom Fact attribute that skips the test if Python 3.8+ is not installed.
/// Tests using this attribute require a Python subprocess and will be skipped
/// on machines without Python (e.g. developers working only on C#).
/// </summary>
public class RequiresPythonFactAttribute : FactAttribute
{
    public static bool PythonAvailable = CheckPythonAvailable();

    public RequiresPythonFactAttribute()
    {
        if (!PythonAvailable)
        {
            Skip = "Python 3.8+ not found. Install Python or set BABEL_TCC_PYTHON to run these tests.";
        }
    }

    public static bool CheckPythonAvailable()
    {
        string envPython = Environment.GetEnvironmentVariable("BABEL_TCC_PYTHON") + "";
        List<string> candidates = new() { "python3", "python", "py" };
        if (envPython.Length > 0)
        {
            candidates.Insert(0, envPython);
        }

        foreach (string candidate in candidates)
        {
            try
            {
                string versionArguments = "--version";
                if (candidate == "py")
                {
                    versionArguments = "-3 --version";
                }

                ProcessStartInfo startInfo = new()
                {
                    FileName = candidate,
                    Arguments = versionArguments,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                using Process process = Process.Start(startInfo)!;
                if (process == null)
                {
                    continue;
                }

                string output = process.StandardOutput.ReadToEnd();
                process.WaitForExit(5000);

                if (output.StartsWith("Python 3."))
                {
                    return true;
                }
            }
            catch
            {
                continue;
            }
        }

        return false;
    }
}
