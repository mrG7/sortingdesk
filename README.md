SortingDesk is a team-oriented collaborative bookmarking tool that
analyzes what you bookmark in order to recommend new queries and data
that can accelerate your investigation.  This is a prototype system
built on Dossier Stack.

Available on the Chrome Store:

https://chrome.google.com/webstore/detail/sorting-desk/ikcaehokdafneaiojndpmfbimilmlnid

And as a plugin in Firefox:

https://addons.mozilla.org/en-US/firefox/addon/sorting-desk/


![](https://github.com/dossier/sortingdesk/blob/master/img/sortingdesk.png)


To run the back end, you can:

 1. run the [container](https://github.com/dossier/dossier-stack), or
 1. contact us to help you: support (at) diffeo.com
 1. checkout these five repos and run the four commands below:

    virtualenv ve

    . ve/bin/activate

    for a in fc store web label models; do pip install dossier.$a; done;

    screen   # so you can leave the following processes running
    
    coordinated -c config.yaml &> coordinated.log &

    coordinatec -c config.yaml flow flow.yaml 

    rejester_worker -c config.yaml --foreground &> worker.log &

    uwsgi --http-socket 0.0.0.0:8080 --wsgi dossier.models.web.wsgi --py-autoreload=2 --processes 1 --pyargv "-c config.yaml" &> uwsgi.log &



Then direct your browser to the configured endpoint, e.g. port 8080 on
the host you created.

