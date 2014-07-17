Fire-Explorer
=============


Sample code to browse and query fire point features using the Esri javascript API. If the ETL's are running correctly, this sample application can query and retrieve thousands (or tens of thousands) of points in a 90 day global archive of satellite detected fire activity. The query parameters include:

**CONFIDENCE**:
The detection confidence is a quality flag of the individual hotspot/active fire pixel.

**FRP**:
Fire Radiative Power. Depicts the pixel-integrated fire radiative power in MW (MegaWatts). FRP provides information on the measured radiant heat output of detected fires. The amount of radiant heat energy liberated per unit time (the Fire Radiative Power) is thought to be related to the rate at which fuel is being consumed)

**BRIGHTT31**
Channel 31 brightness temperature (in Kelvins) of the hotspot/active fire pixel.

**BRIGHTNESS**:
The brightness temperature, measured (in Kelvin) using the MODIS channels 21/22 and channel 31.
