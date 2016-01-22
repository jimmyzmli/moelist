jQuery(document)
	.ready(function($)
	       {
		       var isLoading = false;
		       var page = 0;
		       $(window).scroll(function()
		                        {
			                        var distLeft = $(document).height() - $(window).height() - $(window).scrollTop();
			                        if(distLeft < 100 && !isLoading)
			                        {
				                        isLoading = true;
				                        console.log(page+1);
				                        $.get(window.location.pathname, {'json': true, 'p': ++page}, function(data, status, xhr)
				                        {
					                        var $temp = $(".link:first");
					                        for(var i in data)
					                        {
						                        var $newLink = $temp.clone(true, true);
						                        $newLink.attr('href', data[i]['origin']);
						                        $('img', $newLink).attr('src', data[i]['url']);
												$('body').append($newLink);
					                        }
					                        isLoading = false;
				                        }, 'json');
			                        }
		                        })
	       });