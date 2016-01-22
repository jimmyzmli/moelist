jQuery(document)
	.ready(function($)
	       {
		       var isLoading = false;
		       var page = 0;
		       $(window).scroll(function()
		                        {
			                        var distLeft = $(document).height() - $(window).height() - $(window).scrollTop();
			                        if (distLeft < 100 && !isLoading)
			                        {
				                        isLoading = true;
				                        console.log(page + 1);
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
						                              $('body').append($newLink);
					                              }
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
					                             "height": $(window).height()+"px"
				                             };
				                             if(event.clientX > $(window).width() / 2)
				                             {
					                             vals['right'] = $(window).width() - event.clientX + 35;
				                             }
				                             else
				                             {
					                             vals['left'] = event.clientX + 35;
				                             }
				                             $(".popup").css('left','').css('right','').css(vals).attr('src', event.target.src).show();
			                             }
			                             else
			                             {
				                             $(".popup").hide();
			                             }
		                             });
	       });