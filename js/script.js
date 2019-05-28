var app = {
    requestCounter: 0,
    map: null
};

function buildHeatMap()
{
    console.log('triggered build heatmap');
    ymaps.modules.require(['Heatmap'], function (Heatmap) {

        var heatmap = new Heatmap(heatmapJson, {
            gradient: gradients[0],
            radius: radiuses[3],
            opacity: opacities[2],
            dissipating: true
        });

        buttons.heatmap.events.add('press', function () {
            if (heatmap.getMap()){
                app.map.geoObjects.add(clusterer);
                app.map.controls.remove(buttons.radius);
                heatmap.setMap(null);
            }

            else {
                app.map.geoObjects.remove(clusterer);
                app.map.controls.add(buttons.radius);
                heatmap.setMap(app.map);
            }
        });

        buttons.radius.events.add('press', function () {
            var current = heatmap.options.get('radius'), 
            index = radiuses.indexOf(current);
            heatmap.options.set(
                'radius', radiuses[++index == radiuses.length ? 0 : index]
            );
        });

        app.map.controls.add(buttons.heatmap);
    });
}


function CreateRequest()
{
    var Request = false;
    if (window.XMLHttpRequest)
    {
        //Gecko-совместимые браузеры, Safari, Konqueror
        Request = new XMLHttpRequest();
    }
    else if (window.ActiveXObject)
    {
        //Internet explorer
        try
        {
             Request = new ActiveXObject("Microsoft.XMLHTTP");
        }    
        catch (CatchException)
        {
             Request = new ActiveXObject("Msxml2.XMLHTTP");
        }
    }
 
    if (!Request)
    {
        alert("Невозможно создать XMLHttpRequest");
    }
    
    return Request;
} 

/*
Функция посылки запроса к файлу на сервере
r_method  - тип запроса: GET или POST
r_path    - путь к файлу
r_args    - аргументы вида a=1&b=2&c=3...
r_handler - функция-обработчик ответа от сервера
*/
function SendRequest(r_method, r_path, r_args, r_handler, r_key)
{
    app.requestCounter++;
    //Создаём запрос
    var Request = CreateRequest();
    
    //Проверяем существование запроса еще раз
    if (!Request)
    {
        return;
    }
    
    //Назначаем пользовательский обработчик
    Request.onreadystatechange = function()
    {
        //Если обмен данными завершен
        if (Request.readyState == 4)
        {
            app.requestCounter--;
            if (Request.status == 200)
            {
                //Передаем управление обработчику пользователя
                var responsedata = eval("(" + Request.responseText + ")");
                r_handler(r_key, responsedata);
            }
            if (app.requestCounter == 0) {
                buildHeatMap();
            }
        }
    }
    
    //Проверяем, если требуется сделать GET-запрос
    if (r_method.toLowerCase() == "get" && r_args.length > 0)
    r_path += "?" + r_args;
    
    //Инициализируем соединение
    Request.open(r_method, r_path, true);
    
    if (r_method.toLowerCase() == "post")
    {
        //Если это POST-запрос
        
        //Устанавливаем заголовок
        Request.setRequestHeader("Content-Type","application/x-www-form-urlencoded; charset=utf-8");
        //Посылаем запрос
        Request.send(r_args);
    }
    else
    {
        //Если это GET-запрос
        //Посылаем нуль-запрос
        Request.send(null);
    }
} 


ymaps.ready(function () {
    app.map = new ymaps.Map('YMapsID', {
            center: [51.66996200,39.20781300],
            controls: ['zoomControl', 'typeSelector'],
            zoom: 12
        }),

        clusterer = new ymaps.Clusterer(),
        buttons = {
            heatmap: new ymaps.control.Button({
                data: {
                    content: 'Тепловая карта'
                },
                options: {
                    selectOnClick: false,
                    maxWidth: 150,
                    floatIndex: 10
                }
            }),
            radius: new ymaps.control.Button({
                data: {
                    content: 'Изменить радиус'
                },
                options: {
                    selectOnClick: false,
                    maxWidth: 150,
                    floatIndex: 5
                }
            })
        },

        gradients = [{
            0.1: 'rgba(128, 255, 0, 0.7)',
            0.2: 'rgba(255, 255, 0, 0.8)',
            0.7: 'rgba(234, 72, 58, 0.9)',
            1.0: 'rgba(162, 36, 25, 1)'
        }, {
            0.1: 'rgba(162, 36, 25, 0.7)',
            0.2: 'rgba(234, 72, 58, 0.8)',
            0.7: 'rgba(255, 255, 0, 0.9)',
            1.0: 'rgba(128, 255, 0, 1)'
        }],

        radiuses = [5, 10, 20, 30],
        opacities = [0.4, 0.6, 0.8, 1];

    pointsJson.forEach(function (point){
        clusterer.add(new ymaps.Placemark([point.coordinates.lat, point.coordinates.lng], {
            balloonContentHeader: point.title,
            balloonContent: point.description
        }));
    });

    app.map.geoObjects.add(clusterer);
    app.map.setBounds(app.map.geoObjects.getBounds(), {
        checkZoomRange: true
    });

    for (var i = heatmapJson.length - 1; i >= 0; i--) {
        var Handler = function(key, data)
        {
            var members = data.response.GeoObjectCollection.featureMember;
            if (members.length) {
                console.log('Water is found at ' + members[0].GeoObject.name + ', '+ members[0].GeoObject.Point.pos);
                heatmapJson.splice(key, 1);
            }
        }

        var coords = heatmapJson[i].geometry.coordinates;
        var uri = 'https://geocode-maps.yandex.ru/1.x/?geocode='+coords[1]+','+coords[0]+'&format=json&kind=hydro';
        //Отправляем запрос
        SendRequest("GET", uri, "", Handler, i);
    }
});
