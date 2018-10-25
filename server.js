'use strict'

//PROXY SERVER - API server

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

require('dotenv').config();

const PORT = process.env.PORT;
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('err', err => console.log(err));
const app = express();

app.use(cors());

app.listen(PORT, () => {
  console.log(`app is running on ${PORT}`)
});


//handles error if the data we don't want is returned
function handleError(err, res){
  console.error(`ERR`, err);
  if(res){res.status(500).send(`sorry no peanuts`);}
}

app.get('/location', getLocation);
//app.get('/weather', getWeatherData);
//app.get('/yelp', getYelpData);
//app.get('/movies', getMovieData);

//constructor function for data to normalize data from maps api
function Location(query, data){
  this.search_query = query;
  this.formatted_query = data.formatted_address;
  this.latitude = data.geometry.location.lat;
  this.longitude = data.geometry.location.lng;
}

Location.prototype.save = function() {
  let SQL = `
    INSERT INTO locations
      (search_query,formatted_query,latitude,longitude)
      VALUES($1,$2,$3,$4)
  `;
  //this creates an array of the values in the Location Instance
  let values = Object.values(this);
  client.query(SQL,values);
};

Location.fetchLocation = (query)=>{
  const URL = (`https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`);
  return superagent.get(URL)
    .then( data =>{
      console.log('got data from api');
      if ( ! data.body.results.length){
        throw 'no data';
      }
      else {
        let location = new Location(query, data.body.results[0]);
        location.save();
        return location;
      }
    })
    .catch(error => handleError(error));
};

//function to create object locationHandler and sends database info if results exit in database, if no results calls fetchLocation 
function getLocation (request, response){
  const locationHandler = {
    query: request.query.data,
    cacheHit: (results) =>{
      console.log('got data from sql');
      console.log(locationHandler.query);

      //not sure what the .row[0] do, why can't we use results[0]
      response.send(results.rows[0]);
    },
    cacheMiss: ()=>{
      Location.fetchLocation(request.query.data)
        .then(data => response.send(data))
        .catch(error => handleError(error));
    },

  };
  Location.lookupLocation(locationHandler);
}

Location.lookupLocation = (handler) =>{
  const SQL = `SELECT * FROM locations WHERE search_query = $1`;
  const values = [handler.query];

  return client.query( SQL, values)
    .then( results => {
      if ( results.rowCount > 0){
        handler.cacheHit(results);
      }
      else {
        handler.cacheMiss();
      }
    })
    .catch(console.error);
};


//--------------------Old Location Functions -----------------
//sends request for data, then sends it off
// app.get('/location', (request, response)=>{
//   searchToLatLong(request.query.data)
//     .then(locationData=> {
//       response.send(locationData);
//     })
//     .catch(err => handleError(err,response));
// })

//requests location data from google maps api
// function searchToLatLong(query){
//   const URL = (`https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`);
//   return superagent.get(URL)
//     .then(data =>{
//       if(!data.body.results.length){ throw `NO DATA`;}
//       else{
//         let location = new Location(data.body.results[0]);
//         location.search_query = query;
//         return location;
//       }

//     })
//     .catch(err => handleError(err));
// }


// app.get('/weather',getWeatherData);

// //requests weather data from dark sky api
// function getWeatherData(request, response){
//   const URL = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
//   return superagent.get(URL)
//     .then(results => {
//       const weatherArray = [];
//       results.body.daily.data.forEach((day)=>{
//         weatherArray.push(new Weather(day));
//       })
//       response.send(weatherArray);
//     })
//     .catch(err => handleError(err,response));
// }


// //constructor function for data to normalize data from dark sky api
// function Weather(data){
//   this.time = new Date(data.time*1000).toString().slice(0,15);
//   this.forecast = data.summary;
// }

// //requests yelp data from yelp api
// app.get('/yelp', getYelpData);

// function getYelpData(request, response){

//   const URL = (`https://api.yelp.com/v3/businesses/search?latitude=${request.query.data.latitude}&longitude=${request.query.data.longitude}`);
//   return superagent.get(URL)
//     .set({'Authorization' : `Bearer ${process.env.YELP_API_KEY}`})
//     .then( results =>{

//       const yelpArray = [];
//       results.body.businesses.forEach((e)=>{
//         yelpArray.push(new Yelp(e));

//       })
//       response.send(yelpArray);
//     })
//     .catch(err => handleError(err,response));

// }

// //constructor function for data to normalize data from yelp api
// function Yelp(data){
//   this.name = data.name;
//   this.image_url = data.image_url;
//   this.price = data.price;
//   this.rating = data.rating;
//   this.url = data.url;
// }


// //requests movie data from movieDB api
// app.get('/movies', getMovieData);

// function getMovieData(request, response){
//   console.log(request.query.data.formatted_query);
//   let city = request.query.data.formatted_query.split(', ').slice(0,1);

//   const URL = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&query=${city}&page=1&include_adult=false`;
//   return superagent.get(URL)
//     .then(results =>{
//       console.log(results.body);
//       const movieArray = [];
//       results.body.results.forEach((e)=>{
//         movieArray.push(new Movie(e))
//       })
//       response.send(movieArray);
//     })
//     .catch(err => handleError(err,response));

// }


// //constructor function for data to normalize data from Movie api
// function Movie(data){
//   this.title = data.title;
//   this.overview = data.overview;
//   this.average_votes = data.vote_average;
//   this.total_votes = data.vote_count;
//   this.popularity = data.popularity;
//   this.released_on = data.released_on;
//   this.image_url = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
// }

