'use strict';

// for MusixMatch API search, so can search by LYRICS or ARTIST or SONG
const musixMatchApiKey = '2795af8d7036855a62070800dc64131d';
const searchURL = 'https://api.musixmatch.com/ws/1.1/track.search';
const trackURL = 'https://api.musixmatch.com/ws/1.1/track.lyrics.get';

// link to MusixMatch artist search results
// const linkURL = 'https://www.musixmatch.com/search';

// link to MusixMatch lyrics search results
const linkURL = 'https://www.musixmatch.com/lyrics';

// for Napster API for song samples
const napsterURL = 'https://api.napster.com/v2.2/search';
const napsterApiKey = 'MDJjYmIwM2UtZmU2ZS00MTFjLTk3MWEtNmU5ZWQwN2FjOWQ3';

const options = {
	mode: 'no-cors',
	headers: new Headers({
		'Access-Control-Allow-Origin': '*'
	})
};

function formatQueryParams(params) {
	const queryItems = Object.keys(params).map(
		key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
	);
	return queryItems.join('&');
}

function formatSearchResults(data) {
	// if there are previous results, remove them
	$('#results-list').empty();

	console.log('results = ' + JSON.stringify(data.message.body.track_list));
	
	if (data.message.body.track_list === undefined || data.message.body.track_list.length === 0) {
		$('#results-list').append(`
	<li>
	<h3>No Lyrics Found</h3>
	</li>`);
	} else {
		// iterate through the result array
		for (let i = 0; i < data.message.body.track_list.length; i++) {
			let item = data.message.body.track_list[i].track;
			let track_id = item.track_id;

			getTrack(item.track_id, item.artist_name, item.track_name);
			getNapster(item.track_id, item.artist_name, item.track_name);

			$('#results-list').append(`<li><h3>${item.track_name}</h3>
			Artist: ${item.artist_name}
			<br>Album: ${item.album_name}

		<div class="item">
			<div id="${track_id}-Lyrics" class="lyrics"></div>
			<div id="${track_id}-Napster" class="music"></div>
		</div>
	</li>`);
		}
	}
}

function formatTrackResults(data, track_id, artist_name, track_name) {
	let item = data.message.body.lyrics;
	let lyrics = item.lyrics_body;
	
	// remove all parenthesis = .replace(/[()]/g,"")
	// and replace all non-alphanumeric characters with dashes
	// console.log('track = ' + track_name);
	let track = track_name.trim().replace(/[()]/g,"").replace(/\W+/g, "-");
	let artist = artist_name.trim().replace(/[()]/g,"").replace(/\W+/g, "-");
	//artist_name.split(' ').join('-');

	let output = `<a href="${linkURL}/${artist}/${track}" target="_blank">View Lyrics</a> on MusixMatch<br>`;

	output += lyrics ? `<br>Excerpt:<br><em>${lyrics}</em>` : '<br>';
	output += `<br><br>${item.lyrics_copyright}`;

	// output += (item.pixel_tracking_url !== undefined) ? `<img src="https://tracking.musixmatch.com/t1.0/${item.pixel_tracking_url}">` : `<script type="text/javascript" src="https://tracking.musixmatch.com/t1.0/${item.script_tracking_url}">`;

	// output += `<img src="https://tracking.musixmatch.com/t1.0/${item.pixel_tracking_url}" alt="tracking url">`;

	output += `<script type="text/javascript" src="https://tracking.musixmatch.com/t1.0/${
		item.script_tracking_url
	}">`;

	$(`#${track_id}-Lyrics`).html(output);
}

function formatNapsterResults(data, track_id, track_name) {
	let html_artwork = '';
	let currentTrack = '';
	let currentAlbum = '';
	let releaseDate = '';
	let currentReleaseDate = '';

	let albums = data.search.data.albums;
	let tracks = data.search.data.tracks;

	// console.log('*** album = ' + data.search.data.albums[0].name);
	// console.log('*** track = ' + data.search.data.track[0].name);

	for (let i = 0; i < tracks.length; i++) {
		let track = tracks[i];
		let album = albums[i];


		if(album !== undefined){
		   let releaseDateTemp = album.originallyReleased.substring(0, 10);

		   let releaseDateParts = releaseDateTemp.split('-');

		   let releaseDateArr = [];
		   releaseDateArr.push(releaseDateParts[1]);
		   releaseDateArr.push(releaseDateParts[2]);
		   releaseDateArr.push(releaseDateParts[0]);

		   releaseDate = releaseDateArr.join('/');
		}
		
		// omit duplicate tracks from list
		/*
		console.log('track.albumName = ' + track.albumName );
		console.log('track name = ' + track.name );
		console.log('artist name = ' + track.artistName );
		console.log('currentTrack = ' + currentTrack );
		console.log('currentAlbum = ' + currentAlbum );
		console.log('releaseDate = ' + releaseDate );
		console.log('currentReleaseDate = ' + currentReleaseDate );
		 */
		 
		if (
			track.name.toLowerCase().includes(currentTrack.toLowerCase()) &&
			track.albumName !== currentAlbum 
		) {
			html_artwork += `<div data-track-id="${track.id}" style="background-image:url(https://api.napster.com/imageserver/v2/albums/${track.albumId}/images/300x300.jpg)" alt="${track.name} artwork" class="cover">
					<div class="content-name">${track.name}
							   <br>by ${track.artistName}
							   <br>${track.albumName}
							   <br>${releaseDate}
							 </div>
					 <audio controls="controls">
							   <source src="${track.previewURL}" type="audio/mpeg">
							 </audio>
					</div>`;
		}

		// save current track for comparison
		currentTrack = track.name;
		currentAlbum = track.albumName;
		currentReleaseDate = releaseDate;
	}

	$(`#${track_id}-Napster`).html(html_artwork);
}

function doSearch(searchTerm, options, limit=10) {
	$.ajax({
		type: 'GET',
		//tell API what we want and that we want JSON
		data: {
			apikey: musixMatchApiKey,
			q_track_artist: searchTerm,
			page_size: limit,
			page: 1,
			s_artist_rating: 'desc',
			s_track_rating: 'desc',
			format: 'jsonp',
			callback: 'jsonp_callback'
		},
		url: searchURL,
		// console.log the constructed url
		beforeSend: function(jqXHR, settings) {
			//	console.log('searchURL = ' + settings.url);
		},
		//tell jQuery to expect JSONP
		dataType: 'jsonp',
		//the name of the callback functions
		jsonpCallback: 'jsonp_callback',
		contentType: 'application/json',
		//work with the response
		success: function(data) {
			formatSearchResults(data);
			// doLyricSearch(searchTerm);
		},
		//work with any error
		error: function(jqXHR, textStatus, errorThrown) {
			//	console.log('jqXHR JSON.stringify = ' + JSON.stringify(jqXHR));
			//	console.log('textStatus =' + textStatus);
			//	console.log('errorThrown =' + errorThrown);

			$('#js-error-message')
				.text(`Something went wrong doing artist/song title search: ${textStatus}`)
				.addClass('.error-message');
		},
		// When AJAX call is complete, will fire upon success OR when error is thrown
		complete: function() {
			//	console.log('doSearch AJAX call completed');
		}
	});
}

function doLyricSearch(searchTerm, options, limit=10) {
	$.ajax({
		type: 'GET',
		//tell API what we want and that we want JSON
		data: {
			apikey: musixMatchApiKey,
			q_lyrics: searchTerm,
			page_size: limit,
			page: 1,
			s_artist_rating: 'desc',
			s_track_rating: 'desc',
			format: 'jsonp',
			callback: 'jsonp_callback'
		},
		url: searchURL,
		// console.log the constructed url
		beforeSend: function(jqXHR, settings) {
			//	console.log('searchURL = ' + settings.url);
		},
		//tell jQuery to expect JSONP
		dataType: 'jsonp',
		//the name of the callback functions
		jsonpCallback: 'jsonp_callback',
		contentType: 'application/json',
		//work with the response
		success: function(data) {
			formatSearchResults(data);
		},
		//work with any error
		error: function(jqXHR, textStatus, errorThrown) {
			//	console.log('jqXHR JSON.stringify = ' + JSON.stringify(jqXHR));
			//	console.log('textStatus =' + textStatus);
			//	console.log('errorThrown =' + errorThrown);

			$('#js-error-message')
				.text(`Something went wrong doing this lyrics search: ${textStatus}`)
				.addClass('.error-message');
		},
		// When AJAX call is complete, will fire upon success OR when error is thrown
		complete: function() {
			//	console.log('doSearch AJAX call completed');
		}
	});
}

function getTrack(track_id, artist_name, track_name) {
	$.ajax({
		type: 'GET',
		//tell API what we want and that we want JSON
		data: {
			apikey: musixMatchApiKey,
			track_id: track_id,
			format: 'jsonp',
			callback: 'jsonp_callback'
		},
		url: trackURL,
		// console.log the constructed url
		beforeSend: function(jqXHR, settings) {
			//	console.log('trackURL = ' + settings.url);
		},
		//tell jQuery to expect JSONP
		dataType: 'jsonp',
		//the name of the callback functions
		jsonpCallback: 'jsonp_callback',
		contentType: 'application/json',
		//work with the response
		success: function(data) {
			formatTrackResults(data, track_id, artist_name, track_name);
		},
		//work with any error
		error: function(jqXHR, textStatus, errorThrown) {
			//	console.log('jqXHR JSON.stringify = ' + JSON.stringify(jqXHR));
			//	console.log('textStatus =' + textStatus);
			//	console.log('errorThrown =' + errorThrown);

			$(`#${track_id}-Lyrics`)
				.text(`Something went wrong getting lyrics from Musixmatch.com: ${textStatus}`)
				.addClass('.error-message');
		},
		// When AJAX call is complete, will fire upon success OR when error is thrown
		complete: function() {
			//	console.log('getTrack AJAX call completed');
		}
	});
}

function getNapster(track_id, artist_name, track_name) {
	const params = {
		apikey: napsterApiKey,
		query: artist_name + ' ' + track_name,
		per_type_limit: 10 // maximum number of results to return
	};
	const queryString = formatQueryParams(params);
	const url = napsterURL + '?' + queryString;

	//	console.log('napsterURL = ' + url);

	/*
ALTERNATIVE:
const napsterURL = 'https://api.napster.com/v2.2/search';
const url = napsterURL + `${artist_name}+${track_name}&per_type_limit=10`;
console.log('napsterURL = ' + url);
*/

	fetch(url)
		.then(response => {
			if (response.ok) {
				return response.json();
			}
			response.json().then(err => {
				throw new Error(err);
			});
		})
		.then(data => formatNapsterResults(data, track_id, track_name))
		.catch(err => {
			$(`#${track_id}-Napster`)
				.text(
					`Something went wrong getting Napster info: ${err.error}: ${
						err.message
					}`
				)
				.addClass('.error-message');
		});
}

// display placeholder in field, scroll up to search form, and focus on input field
function resetForm() {
	$('#js-form')[0].reset();
	$('input#js-search-term').attr('placeholder', 'Artist, Song or Lyrics...');
	$('html, body').animate({ scrollTop: $('header').offset().top });
	$('input#js-search-term').focus();

	// clear errors
	$('#js-error-message').empty();

	// clear results list
	$('#results-list').empty();

	//hide the results section
	$('#results').addClass('hidden');

	// focus on searchTerm
	$('.js-search-term').focus();
}

// ************************************************
// SCROLL TO TOP button
var offset = 100;
var duration = 500;
$(window).scroll(function() {
	if ($(this).scrollTop() > offset) {
		$('.back-to-top').fadeIn();
	} else {
		$('.back-to-top').fadeOut();
	}
});
$('.back-to-top').on('click', function(event) {
	event.preventDefault();
	$('html, body').animate({ scrollTop: 0 }, duration);
});


// ************************************************
	// SEARCH EXAMPLES in placeholder
	var searchExamples = [
		'Want some suggestions?',
		'adele rolling in the deep',
		'the beatles all you need is love',
		'bad guy',
		'the police roxanne',
		'old town road',
		'jonas sucker',
		'of an emotional landslide'
	];
	setInterval(function() {
		$('input#js-search-term').attr(
			'placeholder',
			searchExamples[searchExamples.push(searchExamples.shift()) - 1]
		);
	}, 2000);
	
	
// default function loaded in DOM when page loads
function watchForm() {
	$('form').on('click', '#js-search', function(event) {
		event.preventDefault();

		const searchTerm = $('#js-search-term').val();
		const limit = $('#js-max-results').val();

		//check for empty input
		if (searchTerm === '') {
			resetForm();
			//check for whitespace input
		} else if (searchTerm.match(/^\s*$/)) {
			resetForm();
			// if input is valid, display loading graphic, empty result div, scroll to results, and run ajax & fetch calls to Musixmatch and Napster APIs*/
		} else {
			$('input#js-search-term').blur();
			$('html, body').animate({ scrollTop: $('main').offset().top + 10 });
			$('#results-list').empty();
			$('#results-list').html(
				'<div id="loader"><img src="img/loader.gif" alt="loading..."></div>'
			);
			$('#results').removeClass('hidden');
			doSearch(searchTerm, options, limit);
		}
	});
}

$(watchForm);
