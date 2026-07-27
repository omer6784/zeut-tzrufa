#!/bin/zsh
# Launches the touch bridge from Terminal, so Terminal is the app that carries
# the Input Monitoring + Accessibility permissions. Double-click to run.
cd "$(dirname "$0")"

[[ -x ./touch-bridge ]] || swiftc -O touch-bridge.swift -o touch-bridge || {
  echo "Could not build touch-bridge."; read "?Press RETURN to close..."; exit 1
}

while true; do
  ./touch-bridge
  status=$?
  [[ $status -eq 0 ]] && break          # clean exit / Ctrl-C

  echo
  echo "──────────────────────────────────────────────────────────"
  echo "  Terminal needs permission. The settings pane is opening."
  echo "  Turn ON  Terminal  in the list, then come back here."
  echo "  (Not listed? Click + and add /Applications/Utilities/Terminal.app)"
  echo "──────────────────────────────────────────────────────────"

  # Open whichever pane is actually missing.
  if ./touch-bridge 2>&1 | grep -q "Input Monitoring"; then
    open "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent"
  else
    open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
  fi

  echo
  read "?Once the switch is ON, press RETURN to retry (Ctrl-C to quit)... "
  echo
done
