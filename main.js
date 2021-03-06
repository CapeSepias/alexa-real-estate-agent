'use strict';
var Alexa = require('alexa-sdk');
var appId = '';
var active = '';

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = undefined;
    alexa.registerHandlers(stateHandlers);
    alexa.execute();
};

/** Dictionary of statesIds with their unique values. Used primarily for convenience as enumeration. In ES6 I suggest using Symbols instead of unique strings. */
const stateIds = {
    welcome: 'welcome',
    roomSize: 'roomSize',
    roomSize_advice: 'roomSize_advice',
    exit: 'exit',
    roomSize_01_howManyPeople: 'roomSize_01_howManyPeople',
    roomSize_02_fiveYearsOrMore: 'roomSize_02_fiveYearsOrMore',
    roomSize_03_numberOfPeopleInFiveYears: 'roomSize_03_numberOfPeopleInFiveYears',
    roomSize_04_anyExtraGuests: 'roomSize_04_anyExtraGuests',
    roomSize_05_doesItSoundOk: 'roomSize_05_doesItSoundOk',
    roomSize_02_01_rentOrBuy: 'roomSize_02_01_rentOrBuy'
}
/** Dictionary with stateId as key and command as value. */
const stateCommands = {};

/** Takes command, extends its functionality, and then adds into stateCommands dictionary. */
function addCommand(newCommand){
    newCommand.stop = function(){
         gotoState.call(this, stateIds.exit, 'Ok, stoping now.');
    }
    newCommand.error = function(){
        gotoState.call(this, active.id, 'I didn’t hear you well');
    }
    stateCommands[newCommand.id] = newCommand;
}

/** Sets system to the initial state. Since it is supposed to be triggered at "startup" it should be invoked inside 'NewSession'. */
function initState(){
    active = stateCommands[stateIds.welcome];
    this.emit(':ask', active.value.call(this));
}

/** Transitions system to the next state. Optionaly it can say some text on transition. */
function gotoState(nextState, textOnTransition){
    if(nextState === stateIds.exit){
        this.emit(':tell', textOnTransition);
    } 
    else {
        var response = active.value.call(this);
        var isDone = active.isDone;
        active = stateCommands[nextState];
        this.emit(':ask', (textOnTransition || '') +  active.value.call(this));
    }
}

[
    {
        id: stateIds.welcome,
        value: function() {
            return 'Would you like to buy a house?';
        },
        yes: function(){
            gotoState.call(this, stateIds.roomSize);
        },
        no: function(){
            gotoState.call(this, stateIds.exit, 'Ok, I\'ll be here if you need me. Till then...');
        }
    },
    {
        id: stateIds.roomSize,
        value: function() {
            return 'How many bedrooms are you looking for in your new home?';
        },
        yes: function(){
            gotoState.call(this, stateIds.exit);
        },
        no: function(){
            gotoState.call(this, stateIds.exit);
        },
        advice: function(){   
            gotoState.call(this, stateIds.roomSize_advice);
        },
        numberOf: function(){
            var roomNumberSlotRaw = this.event.request.intent.slots.numericalValue.value;
            this.attributes['numberOfRooms'] = roomNumberSlotRaw;
            gotoState.call(this, stateIds.exit, 'Great. Let\'s move on to the next question.');
        },
    },
    {
        id: stateIds.roomSize_advice,
        value: function() {
            return 'To come up with a rough estimate, think about what your future needs will be. <break time="200ms"/> Current family size. Future family size. Do you have guests often? things like that. <break time="500ms"/> Is this enough information for you to take a guess?';
        },
        yes: function(){
            gotoState.call(this, stateIds.roomSize);
        },
        no: function(){
            gotoState.call(this, stateIds.roomSize_01_howManyPeople);
        },
    },
    {
        id: stateIds.roomSize_01_howManyPeople,
        value: function() {
            return 'Okay. No problem. Let me walk you through the process of figuring it out. How many people are in your current household?';
        },
        numberOf: function(){
            var peopleCountSlotRaw = this.event.request.intent.slots.numericalValue.value;
            this.attributes['numberOfPeople'] = peopleCountSlotRaw;
            gotoState.call(this, stateIds.roomSize_02_fiveYearsOrMore);
        }
    },
    {
        id: stateIds.roomSize_02_fiveYearsOrMore,
        value: function() {
            return 'Do you plan on living in your new house for five  years or more?';
        },
        yes: function(){
            gotoState.call(this, stateIds.roomSize_03_numberOfPeopleInFiveYears);
        },
        no: function(){
            gotoState.call(this, stateIds.roomSize_02_01_rentOrBuy);
        },
    },
    {
        id: stateIds.roomSize_02_01_rentOrBuy,
        value: function() {
            return 'Renting is a great solution for periods of less than five years. Are you sure you want to buy?';
        },
        yes: function(){
            gotoState.call(this, stateIds.roomSize_03_numberOfPeopleInFiveYears);
        },
        no: function(){
            gotoState.call(this, stateIds.exit, 'Great. Glad I could help you with your future plans. Good bye!');
        },
    },
    {
        id: stateIds.roomSize_03_numberOfPeopleInFiveYears,
        value: function() {
            return 'Great. How many people do you think will be living in your new house in five years?';
        },
        numberOf: function(){
            var peopleCountSlotRaw = this.event.request.intent.slots.numericalValue.value;
            this.attributes['numberOfPeopleInFiveYears'] = peopleCountSlotRaw;
            gotoState.call(this, stateIds.roomSize_04_anyExtraGuests);
        }
    },
    {
        id: stateIds.roomSize_04_anyExtraGuests,
        value: function() {
            return 'Would you like an extra room for your guests?';
        },
        yes: function(){
            var maxPeopleDefined = Math.max(this.attributes['numberOfPeople'], this.attributes['numberOfPeopleInFiveYears']);
            var suggestedNumberOfBedrooms = Math.ceil((maxPeopleDefined + 1) / 2);
            this.attributes['suggestedNumberOfBedrooms'] = suggestedNumberOfBedrooms;
            gotoState.call(this, stateIds.roomSize_05_doesItSoundOk);
        },
        no: function(){
            var maxPeopleDefined = Math.max(this.attributes['numberOfPeople'], this.attributes['numberOfPeopleInFiveYears']);
            var suggestedNumberOfBedrooms = Math.ceil(maxPeopleDefined / 2);
            this.attributes['suggestedNumberOfBedrooms'] = suggestedNumberOfBedrooms;
            gotoState.call(this, stateIds.roomSize_05_doesItSoundOk);
        },
    },
    {
        id: stateIds.roomSize_05_doesItSoundOk,
        value: function() {
            return 'Based on your answers, I would recommend ' + this.attributes['suggestedNumberOfBedrooms'] + ' bedrooms. Does that sound like a  good guess for now?';
        },
        yes: function(){
            gotoState.call(this, stateIds.exit, 'Fantastic! Let\'s move on to the next question.');
        },
        no: function(){
            gotoState.call(this, stateIds.roomSize, 'Ok. Let\'s try this again <break time="400ms"/>');
        },
    },
    {
        id: stateIds.exit,
        value: function() {
            return 'Hope we helped you!';
        }
    }
].forEach(addCommand);

var stateHandlers = {
    'NewSession': function() {
        console.log('> NewSession');
        initState.call(this);
    },
    // When Alexa does not understand a question it invokes first available intention
    'Error': function(){
        console.log('> Error');
        active.error.call(this);
    },
    'Advice': function(){
        console.log('> Advice');
        active.advice.call(this);
    },
    'NumberOf': function(){
        console.log('> NumberOf');
        active.numberOf.call(this);
    },
    'AMAZON.YesIntent': function() {
        console.log('> AMAZON.YesIntent');
        active.yes.call(this);
    },
    'AMAZON.NoIntent': function() {
        console.log('> AMAZON.NoIntent');
        active.no.call(this);
    },
    'AMAZON.StopIntent': function() {
        console.log('> AMAZON.StopIntent');
        active.stop.call(this);
    },
    'AMAZON.CancelIntent': function() {
        console.log('> AMAZON.CancelIntent');
        active.cancel.call(this);
    },
    'SessionEndedRequest': function () {
        console.log('> SessionEndedRequest');
        this.emit(':tell', 'Goodbye!');
    }
};
