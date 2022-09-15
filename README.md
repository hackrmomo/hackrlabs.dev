# hackrlabs.dev

### Code for running hackrlabs.dev

This website will be the homepage for all of my projects. Any and all projects will be hosted on subdomains. The server on which this runs on will also be responsible for running alahdal.ca (a hub for my family)

## Todo for this page:
- Correct collision logic so that colliding objects don't overlap into other objects (I presume this is because we set the velocity but don't update the location at which the particle ends up. Not only that but we also don't check if it'll collide with another particle if we update the velocity. We may only need the first fix since the subsequent collision SHOULD happen during the next frame anyways rather than this one)
- Resolve lag issues (this may just be because I'm running this on a development server as opposed to building a production ready version)
- Add cool logo or something personal for page
- Add ability to reset each circle to original locations
- Add ability to resize and recalculate number of circles
- Add ability to explode all circles
- Add links to pages
- Update favicon to be an ico

## Possible Projects:
- Mobile Monopoly Client
- The rest of this website
- RFC 3501 compatible IMAP Server built on NodeJS and TypeScript
- HTTP Based Mail Server + Web Client