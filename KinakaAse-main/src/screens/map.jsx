const Map = ({lo,lt}) => {
    return `
          <!DOCTYPE html>
          <html>
          <head>
              <title>Default Map</title>
              <meta name="viewport" content="initial-scale=1.0">
              <meta charset="utf-8">
              <style>
              html,
              body,
              #map {
                  margin: 0;
                  padding: 0;
                  width: 100%;
                  height: 100vh;
              }
              </style>
              <script src="https://apis.mappls.com/advancedmaps/api/c9f95f399844c8543faf779bdb81d76c/map_sdk?layer=vector&v=3.0&callback=initMap1" defer async></script>
          </head>
          <body>
              <div id="map"></div>
              <script>
                let map, Marker1;
                function initMap1 () {
                    map = new mappls.Map('map', {
                        center: [${lt}, ${lo}],
                        zoomControl: false,
                        location: true,
                    });
    
                    Marker1 = new mappls.Marker({
                        map: map,
                        position: {
                            "lat": ${lt},
                            "lng": ${lo}    
                        },
                        fitbounds: true,
                        icon_url: 'https://apis.mapmyindia.com/map_v3/1.png',
                    });
                }
    
                
              </script>
          </body>
          </html>
      `;
  };
  
  export default Map;