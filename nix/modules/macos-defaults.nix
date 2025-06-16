{
  system.defaults = {
    dock = {
      autohide = true;
      tilesize = 43;
      mru-spaces = false; # do not reorder spaces based on usage
      expose-group-apps = true; # workaround for using mission control with aerospace
    };

    spaces.spans-displays = false; # disable "Displays have separate spaces", which works better with aerospace


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
  };
}
