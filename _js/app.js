$(document).ready(function () {
    $('#logo a').tooltip();
    $('#logo a').attr('href', '#/');
    $('#content').hide();

    marked.setOptions({
        highlight: function (code, lang) {
            return hljs.highlight(lang, code).value;
        }
    });

    // Look for supported type of storage to use
    var storageType;
    if (Sammy.Store.isAvailable('session')) {
        storageType = 'session';
    } else if (Sammy.Store.isAvailable('cookie')) {
        storageType = 'cookie';
    } else {
        storageType = 'memory';
    }

    var store = new Sammy.Store({name: 'storage', type: storageType});

    var app = Sammy('#content', function(sam) {

        sam.helpers({
            view: function (page) {
                var c = this;
                anchor = page.split('#')[1];
                page = page.split('#')[0];
                absolutePage = location.href.split('#/')[0].split('/').pop();
                if (absolutePage !== "" && absolutePage !== page) {
                    c.redirect('/#/'+ absolutePage);
                }
                if (page.substr(page.length - 3, 1) != '_') {
                    currentLang = store.get('lang');
                    if (currentLang != conf.defaultLanguage) {
                        page = page +'_'+ currentLang;
                    }
                } else if (page.substr(page.length - 2) == conf.defaultLanguage) {
                    // Indicate page specifically
                    page = page.substr(0, page.length - 3);
                }
                store.set('page', page);

                var d = store.get('data-'+ page);
                if (d !== null) {
                   loadMD(c, d);
                } else {
                    $("#wrapper").fadeOut(150, function() {
                        $.get('_pages/'+ page +'.md', function(data) {
                            loadMD(c, data);
                        }).fail(function() {
                            var append = '';
                            if (store.get('lang') != conf.defaultLanguage) {
                                 append = '_'+ store.get('lang');
                            }
                            $.get('_pages/default'+ append +'.md', function(data) {
                                loadMD(c, data);
                            });
                        });
                    });
                }
            },
            viewPage: function(page) {
                var c = this;
                c.view(page);
                // Get current page
                page = store.get('page')
                title = page +' • '+ conf.siteName;
                $('#sendModal').modal('hide');
                // $('.actions').children().hide();
                $('.actions').addClass('show').addClass('view').removeClass('edit preview');
                $('.languages').addClass('show')
                $('#form').hide();
                $('#edit').attr('href', '#/'+ page +'/edit').fadeIn('fast');
                $('#content').fadeIn('fast');

                defaultLanguage = conf.defaultLanguage;
                languages = conf.languages;
                var href = '#/'+ page;
                if (href.substr(href.length - 3, 1) == '_') {
                    href = href.substr(0, href.length - 3);
                }
                $(".languages ul.dropdown-menu").html('');
                $.each( languages, function( key, val ) {
                    $(".languages ul.dropdown-menu").append('<li><a class="change-language" data-lang="'+ key +'" href="'+ href +'_'+ key +'">'+ val +'</a></li>');
                });
                $(".languages").removeClass('hide').fadeIn('fast');
            }
        });

        sam.get('#/', function (c) {
            absolutePage = location.href.split('#/')[0].split('/').pop();
            if (absolutePage !== "") {
                c.redirect('/#/'+ absolutePage);
            } else {
                c.viewPage('index');
            }
        });

        sam.get('#/:name', function (c) {
            $(".actions").css('opacity', 1);
            c.viewPage(c.params['name']);
        });

        sam.get('#/:name/edit', function (c) {
            c.view(c.params['name']);
            document.title = 'Edit '+ c.params['name'];
            $('#sendModal').modal('hide');
            // $('.actions').children().hide();
            $('.actions').addClass('show').addClass('edit').removeClass('view preview');
            // $('.languages').addClass('hide');
            $('#content').hide();
            $('#preview').attr('href', '#/'+ c.params['name'] +'/preview')// .fadeIn('fast');
            $('#back').attr('href', '#/'+ c.params['name']) // .fadeIn('fast');
            // $('#send').fadeIn('fast');
            $('#form').fadeIn('fast');
            $('#sendModal form').attr('action', '#/'+ c.params['name'] +'/save');
        });

        sam.get('#/:name/preview', function (c) {
            c.view(c.params['name']);
            document.title = 'Preview '+ c.params['name'];
            $('#sendModal').modal('hide');
            // $('.actions').children().hide();
            $('.actions').addClass('show').addClass('preview').removeClass('view edit');
            // $('.languages').addClass('hide');
            $('#form').hide();
            $('#edit').attr('href', '#/'+ c.params['name'] +'/edit') //.fadeIn('fast');
            $('#back').attr('href', '#/'+ c.params['name']) //.fadeIn('fast');
            // $('#send').fadeIn('fast');
            $('#content').fadeIn('fast');
            $('#sendModal form').attr('action', '#/'+ c.params['name'] +'/save');
        });

    });

    function sendModifications(page) {
        email = $('#email').val();
        descr = $('#descr').val();

        $('#reallysend').prop("disabled",true);
        $('#reallysend').after('&nbsp;<img src="/assets/ajax-loader.gif" class="ajax-loader">');
        $.ajax({
            url: 'submit.php',
            type: 'POST',
            data: { 'page': page, 
                    'content': store.get('data-'+ page), 
                    'email': email,
                    'descr': descr 
            }
        })
        .success(function(data) {
            $('#sendModal').modal('hide');
            $('#reallysend').prop("disabled",false);
            $('.ajax-loader').remove();
            $('#win').fadeIn('fast', function() {
                setTimeout(function() {
                    $('#win').fadeOut();
                }, 3000);
            });
            return true;
        })
        .fail(function(xhr) {
            $('#reallysend').prop("disabled",false);
            $('.ajax-loader').remove();
            if (xhr.status == 401) {
                $('#sendModal alert p').html('Wrong username/password combination');
            } else {
                $('#sendFail').html(xhr.responseText);
                $('#sendFail').fadeIn('fast', function() {
                    setTimeout(function() {
                        $('#sendFail').fadeOut();
                    }, 3000);
                });
                return false;
            }
        });
    }

    function loadMD(c, data) {
        html = marked(data);
        $('#form textarea').val(data);
        $('#content').html('');
        c.swap(html, function() {
            if ($("h1").length > 0) {
                title = $("h1:first").text();
                // Add return button before page title
                if (!store.get('page').match(/^index/g)) {
                    $("h1:first").prepend('<a id="previous" href="javascript: history.go(-1)" title="Previous page"><span class="glyphicon glyphicon-chevron-left"></span> </a>');
                }
            }
            $('table').addClass('table').addClass('table-bordered');
            document.title = title +' • '+ conf.siteName;

            // Rewrite links
            $('#content a').each(function () {
                if ($(this).attr('href').match(/^\/?[a-zA-Z0-9_\-]*$/g)) {
                    $(this).attr('href', '/#/'+ $(this).attr('href').replace(/^\//g, ''));
                }
            });

            // Scroll to anchor
            if (typeof anchor !== 'undefined' && $('#'+ anchor).length > 0) {
                $('html, body').animate({
                    'scrollTop': $('#'+ anchor).offset().top - 10
                }, 500);
            } else {
                $(window).scrollTop(0);
            }
            $("#wrapper").show();

        });
    }

    function changeLanguage(lang) {
        $('[data-i18n]').each( function() {
            key = $( this ).attr('data-i18n');
            // Dirty hack to be able to modify other stuff than the inner html,
            // like i18next does.
            if (key.startsWith("[title]"))
            {
                key = key.replace("[title]", "")
                $( this ).attr("title", i18n[lang][key]);
            }
            else if (key.startsWith("[placeholder]"))
            {
                key = key.replace("[placeholder]", "")
                $( this ).prop("placeholder", i18n[lang][key]);
            }
            else
            {
                $( this ).html(i18n[lang][key]);
            }
        });
        store.set('lang', lang);
    }

    $(document).keyup(function(e) {
        if (e.keyCode == 27) {
            page = store.get('page');
            store.set('data-'+ page, $('#form textarea').val());
            href = document.location.href;
            if (href.substr(href.length - 5) == '/edit') {
                document.location.href = '#/'+ page +'/preview';
            } else {
                document.location.href = '#/'+ page +'/edit';
            }
        } else if (e.keyCode == 13 && $('#sendModal input.form-control:focus').length > 0) {
            $('#reallysend').trigger('click');
        }
    });

    $('#back').on('click', function() {
        store.set('data-'+ store.get('page'), null);
    });
    $('#preview').on('click', function() {
        store.set('data-'+ store.get('page'), $('#form textarea').val());
    });
    $('#send').on('click', function() {
        store.set('data-'+ store.get('page'), $('#form textarea').val());
        $("#filename").text(store.get('page') +'.md');
        $("#repogit").text(conf.gitRepository).attr('href', conf.gitRepository);
        $("#gitarea").val($('#form textarea').val());
    });
    $('#reallysend').on('click', function() {
        page = store.get('page');
        if (sendModifications(page)) {
            document.location.href = '#/'+ page;
        }
    });

    $('#sendMail').on('click', function() {
        var w = window.open('', '', 'width=600,height=400,resizeable,scrollbars');
        w.document.write('<strong>'+ i18n[store.get('lang')].to + '</strong>: '+ conf.requestEmail +'<br>'
                        + '<strong>'+ i18n[store.get('lang')].subject + '</strong>: [' + conf.siteName +" Doc Request] "+ escape(store.get('page')) + '.md<br>'
                        +'<strong>'+ i18n[store.get('lang')].body + '</strong>: <pre><code>' + $('#form textarea').val() +'</code></pre>');
        w.document.close();
    });

    $('ul.dropdown-menu').on('click', '.change-language', function() {
        changeLanguage($( this ).attr('data-lang'));
        $('.dropdown-toggle').dropdown('toggle');
    });

    $('#gitarea').focus(function() {
        $(this).select();
    });

    // var timer;

    // $(window).mousemove(function () {
    //     $('.actions').addClass('show');
    //     $('.languages').addClass('show');
    //     try {
    //         clearTimeout(timer);
    //     } catch (e) {}
    //     timer = setTimeout(function () {
    //         $('.actions').removeClass('show');
    //         $('.languages').removeClass('show');
    //     }, 1000);
    // });

    $.getJSON('i18n.json', function(lng) {
        i18n = lng;
        $.getJSON('config/config.json', function(data) {
            conf = data;
            if (store.get('lang') !== null) {
                changeLanguage(store.get('lang'));
            } else {
                language = window.navigator.language.substr(0, 2);
                if (typeof i18n[language] !== 'undefined') {
                    changeLanguage(language);
                } else {
                    changeLanguage(conf.defaultLanguage);
                }
            }
            if (location.href.split('#').length > 1 && !location.href.match(/\/#\//g)) {
                window.location.replace(location.href.split('#')[0]);
            } else {
                app.run('#/');
            }
        });
    });
});
