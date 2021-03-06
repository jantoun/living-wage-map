define(['jquery',
  'leaflet',
  'sweetAlert',
  'esri-leaflet',
  'esri-leaflet-geocoder',
  'leaflet-touch-hover'],
  function($,
    L,
    swal){

    var internals = {};

    internals.createMap = function(){
      L.Icon.Default.imagePath = 'resources/images/mapIcons';

      var map = internals.map = L.map(internals.settings.el,
        internals.settings.config.leafletOptions);

      map.on('load',function(){
        internals.onLoad();
      });

      if (L.Browser.touch) {
        L.control.touchHover().addTo(map);
        $('.leaflet-control-touchhover-toggle').addClass('icon-lock').click(function(){
          if ($(this).hasClass('leaflet-control-touchhover-toggled')){
            $(this).removeClass('icon-lock-open').addClass('icon-lock');
          }
          else{
            $(this).removeClass('icon-lock').addClass('icon-lock-open');
          }
        });
        swal({
          title: 'Navigation Tips',
          text: '<ul class="navigation-tips">\
          <li>Drag your finger over the map to explore wages</li>\
          <li>Tap the <span class="icon-lock"></span> button to pan or zoom the map</li>\
          <li>Tap the <span class="icon-lock-open"></span> button to switch back to wage exploration</li>\
          <li>Tap the <span class="icon-home"></span> button to go back to see the Continental US</li>\
          </ul>',
          html: true
        });
      }

      internals.geocodeResults = L.layerGroup().addTo(map);

      if (internals.settings.config.initialBounds){
        map.fitBounds(internals.settings.config.initialBounds);
      }

      $('.home-btn-wrapper').click(function(){
        map.fitBounds(internals.settings.config.initialBounds);
      });

      $('.geocoder-control input').keydown(function(e){
        if (e.keyCode === 13) {
          internals.geocodeSearch($(this).val());
        }
      });

      $('.geocoder-control .icon-search').click(function(){
        var val = $(this).siblings('.geocoder-control-input').val();
        internals.geocodeSearch(val);
      });

    };

    internals.geocodeSearch = function(val){
      $('.geocoder-icon').addClass('icon-wait animate-spin').removeClass('icon-search');

      var task = new L.esri.Geocoding.Tasks.Geocode().category('Populated Place').text(val || $('.geocoder-control input').val());
      task.run(function(err,result){
        $('.geocoder-icon').removeClass('icon-wait animate-spin').addClass('icon-search');
        if (!err){
          $.each(result,function(){
            var ftr;

            $.each(this,function(){

              if (!ftr && this.properties.Country === 'USA'){
                ftr = this;
              }

            });

            if (ftr){
              var loc = ftr.latlng;
              var marker = L.marker(loc);
              internals.geocodeResults.clearLayers();
              internals.onGeocodeClear();
              internals.onGeocode(ftr);
              internals.geocodeResults.addLayer(marker);
              marker.on('popupopen',function(){
                $('.clear-geocode').click(function(){
                  internals.geocodeResults.clearLayers();
                  internals.onGeocodeClear();
                  $('.geocoder-control input').val('');
                });
              });
              marker.bindPopup(ftr.text + '<br /><div class="clear-geocode">Remove</div>',{
                closeOnClick: false
              }).openPopup();
              internals.map.setView(loc);
              $('.mobile-menu').velocity('slideUp',{duration:500});
              $('.mobile-footer .region-right span').removeClass('icon-down-open-big').addClass('icon-up-open-big');
            }
            else{
              swal({
                title: 'No Search Results',
                text: 'The search text you provided returned no results. Check the accuracy of your text or try making your search more specific.',
                confirmButtonText: 'Try Again',
                type: 'warning'
              });
            }
          });
        }
      });
    };

    internals.toggleLayers = function(show,hide,duration){
      if (show && show.setOpacity){
        show.setOpacity(0);
        internals.map.addLayer(show);
        internals.fadeLayer({
          layer: show,
          finalOpacity: 1,
          duration: duration
        });
      }
      else if(show){
        internals.map.addLayer(show);
      }
      if (hide && hide.setOpacity){
        internals.fadeLayer({
          layer: hide,
          finalOpacity: 0,
          duration: duration
        });
      }
      else if(hide){
        internals.map.removeLayer(hide);
      }
    };

    internals.fadeLayer = function(options){

      var defaults = {
        duration: 500,
        removeIfInvisible: true
      };

      var settings =  $.extend(true,defaults,options);

      if (settings.layer.fadeTimeout){
        clearTimeout(settings.layer.fadeTimeout);
      }

      if (settings.layer.options.opacity || settings.layer.options.opacity === 0){

        if (settings.removeIfInvisible && settings.finalOpacity <= 0 && settings.layer.options.opacity <= 0){
          internals.map.removeLayer(settings.layer);
        }
        else if (settings.opacityChange && settings.opacityChange >= 0 && settings.layer.options.opacity >= settings.finalOpacity){
          settings.layer.setOpacity(settings.finalOpacity);
        }
        else{
          settings.delay = settings.delay || settings.duration / ((settings.duration/1000) * 60);
          settings.opacityChange = settings.opacityChange || (settings.finalOpacity - settings.layer.options.opacity) / ((settings.duration/1000) * 60);

          settings.layer.setOpacity(settings.layer.options.opacity + settings.opacityChange);
          settings.layer.fadeTimeout = setTimeout(function(){
            internals.fadeLayer(settings);
          },settings.delay);
        }

      }

    };

    internals.onLoad = function(){
      $(internals.self).trigger('load');
    };

    internals.onGeocodeClear = function(){
      $(internals.self).trigger('geocode-clear');
    };

    internals.onGeocode = function(ftr){
      $(internals.self).trigger({
        type: 'geocode',
        feature: ftr
      });
    };

    return function (options){
      var defaults = {
        el: 'map',
        includeGeocoder: true
      };

      internals.settings = $.extend(true,defaults,options);
      internals.self = this;

      this.init = function(){
        internals.createMap();
      };

      this.toggleLayers = internals.toggleLayers;
    };

});