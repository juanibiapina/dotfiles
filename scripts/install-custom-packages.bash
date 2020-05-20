if [ "$(uname)" = "Linux" ]; then
  echo "Installing custom packages"
  # Build arch packages
  for pkg in assets/arch/*; do
    (
      cd "$pkg"
      makepkg -ci --noconfirm
    )
  done
fi
