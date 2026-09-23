#!/bin/bash
# Script to help identify files that need dialog replacements
echo "Files with window.confirm:"
grep -r "window\.confirm" components/ --files-with-matches | head -20
echo ""
echo "Files with window.alert:"
grep -r "window\.alert" components/ --files-with-matches | head -20
echo ""
echo "Files with window.prompt:"
grep -r "window\.prompt" components/ --files-with-matches | head -20
