# https://docs.doppler.com/docs/cli#installation
{
  homebrew = {
    taps = [
      "dopplerhq/cli"
    ];

    brews = [
      # dependencies
      "gnupg"

      "doppler"
    ];
  };
}
