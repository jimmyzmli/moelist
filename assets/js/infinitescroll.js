jQuery(document)
    .ready(function($)
    {
        var queryDict = {};
        var isLoading = false;
        var page = 0;

        location.search.substr(1).split("&").forEach(function(item)
        {
            queryDict[item.split("=")[0]] = item.split("=")[1]
        });

        if (queryDict.hasOwnProperty('p'))
        {
            page = parseInt(queryDict['p']);
        }

        function ReflowRows()
        {
            var group = [];
            var $lastRow = $("#img-view .row:last");
            var t = $(".link", $lastRow).detach();
            $("#img-view").prepend(t);

            function flushRow()
            {
                $row = $("<div class=\"row\"/>").append($(group).detach());
                $("#img-view").append($row);
                group.length = 0;
            }

            $("#img-view > .link").each(function(i, link)
            {
                group.push(link);
                if (group.length == 4)
                {
                    flushRow();
                }
            });
            flushRow();
            window.registerEvents();
        }

        ReflowRows();

        $(window).scroll(function()
        {
            var distLeft = $(document).height() - $(window).height() - $(window).scrollTop();
            if (distLeft < 100 && !isLoading)
            {
                isLoading = true;
                $.get(window.location.pathname, {
                    'json': true,
                    'p': ++page
                }, function(data, status, xhr)
                {
                    var $temp = $(".link:first");
                    for (var i in data)
                    {
                        var $newLink = $temp.clone();
                        $newLink.attr('data-origin', data[i]['origin']).attr('data-src', data[i]['src']).attr('title', data[i]['tags'].join(', '));
                        $('img', $newLink).attr('src', data[i]['url']);
                        $('#img-view').append($newLink);
                    }
                    ReflowRows();
                    isLoading = false;
                }, 'json');
            }
        });
    });