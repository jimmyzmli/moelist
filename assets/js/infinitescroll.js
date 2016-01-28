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
                        var $newLink = $temp.clone(true, true);
                        $newLink.attr('href', data[i]['origin']);
                        $('img', $newLink).attr('src', data[i]['url']);
                        $('#img-view').append($newLink);
                    }
                    ReflowRows();
                    isLoading = false;
                }, 'json');
            }
        });

        $(document).mousemove(function(event)
        {
            if ($(event.target).prop("tagName") == "IMG" && !$(event.target).hasClass('popup'))
            {
                var vals = {
                    "position": "absolute",
                    "top": $(window).scrollTop(),
                    "height": $(window).height() + "px"
                };

                var newWidth = $(window).height() * (event.target.width / event.target.height);

                if (event.clientX > $(window).width() / 2)
                {
                    var max = event.clientX - 35;
                    if (newWidth > max)
                    {
                        vals['width'] = max + "px";
                        vals['height'] = '';
                    }
                    vals['right'] = $(window).width() - event.clientX + 35;
                }
                else
                {
                    var max = $(window).width() - event.clientX - 35;
                    if (newWidth > max)
                    {
                        vals['width'] = max + "px";
                        vals['height'] = '';
                    }
                    vals['left'] = event.clientX + 35;
                }
                $(".popup").css('left', '').css('right', '').css('height', '').css('width', '').css(vals).attr('src', event.target.src).show();
            }
            else
            {
                $(".popup").hide();
            }
        });
    });