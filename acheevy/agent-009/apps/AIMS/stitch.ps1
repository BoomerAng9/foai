function stitch {
    $personaPath = "$PSScriptRoot\.stitch\persona.md"
    if (!(Test-Path $personaPath)) {
        Write-Error "Stitch Persona not found at $personaPath"
        return
    }
    
    $persona = Get-Content $personaPath -Raw
    $userArgs = $args -join " "
    
    # Check if gemini is available
    if (!(Get-Command gemini -ErrorAction SilentlyContinue)) {
        Write-Error "Gemini CLI not found. Please install it."
        return
    }

    # Construct the combined prompt
    # We pass the persona as a system instruction context
    $combinedPrompt = "SYSTEM_INSTRUCTION:`n$persona`n`nUSER_COMMAND:`n$userArgs"
    
    Write-Host "🧵 Stitch: Weaving with Gemini..." -ForegroundColor Cyan
    
    # Invoke Gemini with the combined prompt
    # Adjust arguments based on how Gemini CLI accepts input. 
    # Assuming standard positional argument for prompt.
    gemini $combinedPrompt
}

# Function is available when dot-sourced
Write-Host "Stitch loaded. Use 'stitch <prompt>'." -ForegroundColor Green
