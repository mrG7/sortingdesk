

Engineering Projects: Q1 2015
=============================

The *goal* of this living document is to plan out the larger picture
of development work for Miguel Guedes.  We plan to extend and revise
over the next couple months as the initial projects in this plan get
completed and hooked together.

Details of these projects will be recorded and managed in other files.
This file contains *user stories* and high level *roadmap*.


Overview
--------

Diffeo's mission is to *help people* organize the world's information.
The projects described here focus on FOSS components that further this
mission.  This projects focus on HTML5 apps and browser extensions.
Initially, the projects are separated, and we invision a more unified
application emerging out of these components.


Software Licensing
------------------

These projects are intended to be free, open source software (FOSS),
and we plan to develop them in GitHub using the standard procedure of
contributors forking the relevant repo, building code, issuing pull
requests, and a member of Diffeo staff merging them to master.

Diffeo has source code audit rules that require a member of Diffeo's
US staff review and merge contributions from Diffeo's growing
contractor work force, which is often international in origin.

Diffeo has patent-pending user interface inventions that must remain
separate from these FOSS components.  Some of the FOSS components will
be interacting with API boundaries designed to protect the inventions.
On occasion, these boundaries may be found inadequate and need
refactoring.  When this happens, portions of public git repos,
including forks, may need to be removed with history editing.



SortingDesk
-----------

SortingDesk is the foundation app for this FOSS development.  The
other projects listed below can start as standalone prototypes for
their first several revs before we figure out how they can/should be
integrated into SortingDesk.

SortingDesk is intentionally a prototype.  The nature of the current
user targets is "pilot" oriented by design.  Parts of it should become
clean and polished.  At the same time, other parts of this stack
underneath SortingDesk will be deployed in quasi-production in ways
that would not scale to real consumer Web usage.  This is important to
keep in mind during development, because some design tradeoffs can be
managed differently.

Diffeo plans produce a version of this extension for broad consumer
Web use.  That version will probably incorporate Diffeo's
patent-pending user interface inventions.  That future version could
be given a different name (e.g. "The Diffeo Browser Extension"), or we
might stop FOSS development of SortingDesk at a particular version
number and move future version numbers into a private git repo.  We
plan to revisit this in H2 2015.


'''User Story 1:''' as an analyst focused on online threats, I often
need to browse into the Web underworld and gather evidence or
understand the techniques, tactics, and procedures of underworld
people and groups.  Examples of online threats include human
trafficking, organized crime, cyber hacking, and trade of illicit
goods, such as counterfeit pharmaceuticals and diplomas.  These groups
tend to engage in complex online behavior using particular
technologies, such as "blackhat" SEO, forum discussions, Tor, IRC,
breaking into web servers, and cryptic advertising in classified
advertisement sites, such as backpage.com.  Criminals often need to
advertise their goods or services, and this exposes their operations.
As an analyst combating these activities, I intentionally browse into
these sites and cut-and-paste information into Excel and Word.  For
example, I gather usernames, phone numbers, names of tools, portions
of advertisements, and other snippets of information that will help me
piece together the activites of individual threat actors, groups, and
larger trends.  Then, I return to Google and try querying for terms
that I found.  This painstaking process is error prone, and I would
prefer to drag-and-drop content into a foldering system that follows
me in the browser and is visible to the AI in the search engines.
Ideally, my folders would tell search engines what I need so they can
serve it up to me without my ever having to go back to Google.

'''User Story 2:''' as a denizen of the Web, I know how to find stuff
that interests me.  I have at least one new project every week, and I
know how to use Google's advanced query syntax to details.  Last week,
it was shortwave radio broadcasts from Russia's rebranded Radio
Sputnik and now I am studying sapphire glass.  I have thousands of
bookmarks in Chrome, dabble with Evernote, and use the Papers app to
gather PDFs.  What I really want is a fully featured bookmarking tool
that remembers specific parts of pages that I highlight, and caches a
copy for my long-term archive.  When I am digging into a new topic, my
foldering systems should tell the search engines what I am gathering,
so they can proactively feed me what I currently extract with
hand-tweaked keyword queries.


Technical Milestones:

 * browser extension that enables basic CONOPS for user stories. 

 * refine JavaScript APIs between three subsystems: 
   1. foldering system,
   2. highlighting
   3. dossier.label

 * create in-browser highlighting, so that uses can easily highlight
   anything they see.  When user returns to a page, the highlights
   re-appear.  Each subfolder is a different colored highlighter.

 * (pay down technical debt of rapidly inventing previous milestones)

 * enable easy exploration of gathered content in something like a
   photo gallery

 * create social features for collaborating in groups on folders

 * (pay down technical debt of rapidly inventing previous milestones)

 * make extension broadly available to the public



TREC DD Annotation and Assessing Tool
-------------------------------------

[NIST](http://www.nist.gov) has hosted {TREC](http://trec.nist.gov/)
for over twenty years as one of the premier conference forums for
evaluating search engines.  It has had [major influence on search
engines](https://en.wikipedia.org/wiki/Text_Retrieval_Conference).
The Diffeo team created and ran the [Knowledge Base Acceleration
(KBA)](http://trec-kba.org/) evaluation in TREC for three years from
2012-2014.

Diffeo is now co-organizing [TREC Dynamic Domain
(DD)](http://trec-dd.org/) with other DARPA Memex performers.

As part of TREC DD, NIST will hire a group of people to perform manual
assessments of documents.  These people are called assessors.  The
organizers will help the assessors develop topics of interest in three
collections of text:

  1. forum posts related to trade in illicit goods
  2. websites and tweets related to Ebola in West Africa
  3. local politician web sites for the Vancover-Seattle region

Each topic will be expressed by a keyword query.  The search engine
used for assessing will then present documents to the assessors, so
they can record this information:

  1. judge whether the document is on topic:  True|False

  2. If on topic, then highlight what substrings that are relevant.

  3. Assign each relevant substring to a specific subtopic (subfolder)

  4. Assign a rating score 1-4 for each such substring


For this assessing task, we need a user interface.  Since the assessor
budget is limited, their time is precious.  We would like to make a
highly optimized tool that allows them to move quickly and
efficiently.  We imagine that a keystroke-only interface that does not
require mouse movements for highlighting would be most effective.  The
texts will be cleansed and stripped to have minimal HTML and no
dynamic content complexity.



StreamCorpus Zoner Training Interface
-------------------------------------

Background: SortingDesk relies on
[DossierStack](https://github.com/dossier) for its back end.  The
features stored in the FeatureCollections (FCs) are derived from text
processing.  Diffeo developed the
[streamcorpus](http://streamcorpus.org/) tools to perform text
processing on large corpora.  Currently, the only system that combines
streamcorpus and dossier stack is Diffeo's commercial search engine,
DEHC.

Currently, streamcorpus components are spread across two github
organizations; we plan to finish migrating all the repos to the
streamcorpus organization soon:

https://github.com/streamcorpus

https://github.com/trec-kba

The [StreamCorpus
Zoner](https://github.com/streamcorpus/streamcorpus-zoner) is a
[StreamCorpus
Pipeline](https://github.com/trec-kba/streamcorpus-pipeline) transform
that provides a trainable text document segmenter that identifies
zones of a document automatically using an SVM+HMM model. It is based
on SVM^light.

The python package provides a transform stage called zoner that can be
configured to chop out unwanted sections of
StreamItem.body.clean_{html,visible} before NER tagging.

The zoner package is still in early development.  Its purpose is to
*learn* from training data which parts of text documents are
considered ``body``, ``byline``, ``publication date``, ``title``,
``nav links``, ``footer``, etc.  To train the zoner on a new genre of
documents one must markup examples.  Genres of text abound on the Web,
e.g. blog posts or classified advertisements or SEC filings or legal
proceedings,

The purpose of the *training interface* is to enable rapid markup of
texts to train the zoner.  We envision two modes of operating:

cleansed text mode: streamcorpus-pipeline cleanses and normalizes
text, so that by the time it reaches the zoner, it can be presented
with either minimal HTML tags that preserve basic structure or just
tag-stripped unicode.  In cleansed text mode, the training interface
presents the user with this highly processed form of the text, which
might appear quite different from the original PDF or DOM-rendered
page.  The interface can display colored highlighting based on the
zoner's current output, and the user can *correct* it to produce
human-perfected training data.

live browsing mode: after getting cleansed text mode into regular use
with Diffeo people, and possibly with Mechanical Turkers, it might be
useful to build a version that is more end-user facing in nature.
Instead of presenting the backend system's cleansed view of the text,
the user could look at a page from SortingDesk, and instead of
gathering snippets, they could teach the system which parts of the
page are most interesting.

