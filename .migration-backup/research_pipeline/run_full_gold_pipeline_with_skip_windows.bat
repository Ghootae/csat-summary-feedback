@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

REM ============================================================
REM Full GOLD Pipeline for Windows CMD - SKIP EXISTING OUTPUTS
REM Steps:
REM 1) Normalize crawling results
REM 2) Extract passage thesis
REM 3) Extract paragraph anchors
REM 4) Extract final GOLDs
REM 5) Score core importance
REM ============================================================

set PYTHON=python

echo.
echo ============================================================
echo [1/5] Normalize input result JSON files
echo ============================================================

if not exist data\normalized mkdir data\normalized

for %%f in (data\input\*_result.json) do (
  set "BASE=%%~nf"
  set "PID=!BASE:_result=!"
  set "OUT=data\normalized\!PID!_passage.json"

  if exist "!OUT!" (
    echo [SKIP] normalized exists: !OUT!
  ) else (
    echo [RUN ] normalize: %%f
    %PYTHON% -m src.gold_ablation.normalize_input --input "%%f" --out data\normalized
    if errorlevel 1 (
      echo [ERROR] normalize_input failed for %%f
      pause
      exit /b 1
    )
  )
)

echo.
echo ============================================================
echo [2/5] Extract passage thesis
echo ============================================================

if not exist data\thesis mkdir data\thesis

for %%f in (data\normalized\*_passage.json) do (
  set "BASE=%%~nf"
  set "PID=!BASE:_passage=!"
  set "OUT=data\thesis\!PID!_thesis.json"

  if exist "!OUT!" (
    echo [SKIP] thesis exists: !OUT!
  ) else (
    echo [RUN ] thesis: %%f
    %PYTHON% -m src.gold_ablation.extract_passage_thesis --input "%%f"
    if errorlevel 1 (
      echo [ERROR] extract_passage_thesis failed for %%f
      pause
      exit /b 1
    )
  )
)

echo.
echo ============================================================
echo [3/5] Extract paragraph anchors
echo ============================================================

for %%f in (data\normalized\*_passage.json) do (
  set "BASE=%%~nf"
  set "PID=!BASE:_passage=!"
  set "THESIS=data\thesis\!PID!_thesis.json"
  set "FIRST_ANCHOR=data\paragraph_anchors\!PID!\P1_paragraph_anchor.json"

  if not exist "!THESIS!" (
    echo [SKIP] thesis missing: !THESIS!
  ) else (
    if exist "!FIRST_ANCHOR!" (
      echo [SKIP] anchors appear to exist for !PID!
    ) else (
      echo [RUN ] anchors: %%f
      %PYTHON% -m src.gold_ablation.extract_paragraph_anchor ^
        --input "%%f" ^
        --thesis "!THESIS!" ^
        --prompt prompts\00b_extract_paragraph_anchor.md ^
        --out data\paragraph_anchors ^
        --temperature 0.2

      if errorlevel 1 (
        echo [ERROR] extract_paragraph_anchor failed for %%f
        pause
        exit /b 1
      )
    )
  )
)

echo.
echo ============================================================
echo [4/5] Extract final GOLDs from paragraph anchors
echo ============================================================

for /r data\paragraph_anchors %%f in (*_paragraph_anchor.json) do (
  set "ANCHOR=%%f"
  set "PARENT=%%~dpf"
  set "PARA=%%~nf"
  set "PARA=!PARA:_paragraph_anchor=!"

  for %%a in ("!PARENT!..") do set "PID=%%~nxa"
  set "OUT=data\golds\!PID!\!PARA!_gold.json"

  if exist "!OUT!" (
    echo [SKIP] gold exists: !OUT!
  ) else (
    echo [RUN ] gold: %%f
    %PYTHON% -m src.gold_ablation.extract_gold_from_anchor ^
      --input "%%f" ^
      --prompt prompts\06_extract_gold_from_anchor.md ^
      --out data\golds ^
      --temperature 0.2

    if errorlevel 1 (
      echo [ERROR] extract_gold_from_anchor failed for %%f
      pause
      exit /b 1
    )
  )
)

echo.
echo ============================================================
echo [5/5] Score core importance
echo ============================================================

if not exist data\core_importance mkdir data\core_importance

for /r data\golds %%f in (*_gold.json) do (
  set "GOLD=%%f"
  set "PARENT=%%~dpf"
  set "PARA=%%~nf"
  set "PARA=!PARA:_gold=!"

  for %%a in ("!PARENT!..") do set "PID=%%~nxa"
  set "ANCHOR=data\paragraph_anchors\!PID!\!PARA!_paragraph_anchor.json"
  set "OUT=data\core_importance\!PID!\!PARA!_importance.json"

  if exist "!OUT!" (
    echo [SKIP] importance exists: !OUT!
  ) else if not exist "!ANCHOR!" (
    echo [SKIP] anchor missing for importance: !ANCHOR!
  ) else (
    echo [RUN ] importance: %%f
    %PYTHON% -m src.gold_ablation.extract_core_importance ^
      --input "%%f" ^
      --anchors data\paragraph_anchors ^
      --prompt prompts\07_score_core_importance.md ^
      --out data\core_importance ^
      --temperature 0.2

    if errorlevel 1 (
      echo [ERROR] extract_core_importance failed for %%f
      pause
      exit /b 1
    )
  )
)

echo.
echo ============================================================
echo DONE. Outputs:
echo   data\normalized
echo   data\thesis
echo   data\paragraph_anchors
echo   data\golds
echo   data\core_importance
echo ============================================================
pause
endlocal
