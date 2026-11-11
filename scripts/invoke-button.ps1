# Invokes a named button inside the running Arya Duta Persentasion Studio
# window using UI Automation (works with WebView2's accessibility tree).
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$targetName = $args[0]
$process = Get-Process -Name "arya-duta-persentasion-studio" | Select-Object -First 1
if (-not $process) { throw "app not running" }

$root = [System.Windows.Automation.AutomationElement]::FromHandle($process.MainWindowHandle)
$condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, $targetName)
$button = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
if (-not $button) {
    # Fall back: search buttons by control type and print names for debugging.
    $btnCondition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)
    $buttons = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $btnCondition)
    Write-Host "Button '$targetName' not found. Visible buttons:"
    foreach ($b in $buttons) { Write-Host " - $($b.Current.Name)" }
    exit 1
}
$invoke = $button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
$invoke.Invoke()
Write-Host "invoked: $targetName"
