{

  system.defaults = {
    dock = {
      autohide = true;
      tilesize = 43;
      mru-spaces = false; # do not reorder spaces based on usage
    };

    spaces = {
      spans-displays = false; # this conflicts with aerospace
    };

    NSGlobalDomain = {
      InitialKeyRepeat = 10;
      KeyRepeat = 1;

      ApplePressAndHoldEnabled = false; # disable holding keys for extra symbols
      NSAutomaticCapitalizationEnabled = false; # disable smart capitalization
      NSAutomaticDashSubstitutionEnabled = false; # disable smart dashes
      NSAutomaticPeriodSubstitutionEnabled = false; # disable smart period
      NSAutomaticQuoteSubstitutionEnabled = false; # disable smart quotes

      "com.apple.trackpad.scaling" = 2.0; # trackpad speed
    };

    WindowManager = {
      EnableStandardClickToShowDesktop = false; # disable click to show desktop
    };
  };
}
