const Discord=require('discord.js');

module.exports.run = async (MAIN, message, prefix, discord) => {

  // DECLARE VARIABLES
  let nickname = '';

  // GET USER NICKNAME
  if(message.member.nickname){ nickname = message.member.nickname; } else{ nickname = message.member.user.username; }

  let request_action = new Discord.RichEmbed()
    .setAuthor(nickname, message.member.user.displayAvatarURL)
    .setTitle('What would you like to do with your Quest Subscriptions?')
    .setDescription('`view`  »  View your Subscritions.\n'
                   +'`add`  »  Add a Reward to your Subscriptions.\n'
                   +'`remove`  »  Remove a Reward from your Subscriptions.\n'
                   +'`pause` or `resume`  »  Pause/Resume Quest Subscriptions.')
    .setFooter('Type the action, no command prefix required.');

  message.channel.send(request_action).catch(console.error).then( msg => {
    return initiate_collector(MAIN, 'start', message, msg, nickname, prefix);
  });
}

// PAUSE OR RESUME QUEST SUBSCRIPTIOONS
function subscription_status(MAIN, message, nickname, reason, prefix){
  MAIN.database.query("SELECT * FROM pokebot.users WHERE user_id = ? AND discord_id = ?", [message.member.id, message.guild.id], function (error, user, fields) {
    if(user[0].quest_paused == 'ACTIVE' && reason == 'resume'){
      let already_active = new Discord.RichEmbed().setColor('ff0000')
        .setAuthor(nickname, message.member.user.displayAvatarURL)
        .setTitle('Your Quest Subscriptions are already ACTIVE!')
        .setFooter('You can type \'view\', \'time\' \'add\', or \'remove\'.');;
      message.channel.send(already_active).catch(console.error).then( msg => {
        return initiate_collector(MAIN, 'status', message, msg, nickname, prefix);
      });
    }
    else if(user[0].quest_paused == 'PAUSED' && reason == 'pause'){
      let already_paused = new Discord.RichEmbed().setColor('ff0000')
        .setAuthor(nickname, message.member.user.displayAvatarURL)
        .setTitle('Your Quest Subscriptions are already PAUSED!')
        .setFooter('You can type \'view\', \'time\' \'add\', or \'remove\'.');;
      message.channel.send(already_paused).catch(console.error).then( msg => {
        return initiate_collector(MAIN, 'status', message, msg, nickname, prefix);
      });
    }
    else{
      if(reason == 'pause'){ change = 'PAUSED'; }
      if(reason == 'resume'){ change = 'ACTIVE'; }
      MAIN.database.query("UPDATE pokebot.users SET quests_status = ? WHERE user_id = ? AND discord_id = ?", [change, message.member.id, message.guild.id], function (error, user, fields) {
        if(error){ return message.reply('There has been an error, please contact an Admin to fix.').then(m => m.delete(10000)).catch(console.error); }
        else{
          let subscription_success = new Discord.RichEmbed().setColor('00ff00')
            .setAuthor(nickname, message.member.user.displayAvatarURL)
            .setTitle('Your Quest Subscriptions have been set to `'+change+'`!')
            .setDescription('Saved to the Pokébot Database.')
            .setFooter('You can type \'view\', \'time\' \'add\', or \'remove\'.');;
          message.channel.send(subscription_success).catch(console.error).then( msg => {
            return initiate_collector(MAIN, 'status', message, msg, nickname, prefix);
          });
        }
      });
    }
  });
}

// SUBSCRIPTION VIEW FUNCTION
async function subscription_view(MAIN, message, nickname, prefix){
  MAIN.database.query("SELECT * FROM pokebot.users WHERE user_id = ? AND discord_id = ?", [message.member.id, message.guild.id], function (error, user, fields) {

    // CHECK IF THE USER ALREADY HAS SUBSCRIPTIONS AND ADD
    if(!user[0].quests){ return message.reply('You have no saved Quest subscriptions.').then(m => m.delete(5000)).catch(console.error); }
    else{

      let user_quests = user[0].quests.split(',');

      if(!user_quests[0]){

        // CREATE THE EMBED
        let no_subscriptions = new Discord.RichEmbed()
          .setAuthor(nickname, message.member.user.displayAvatarURL)
          .setTitle('You do not have any Quest Subscriptions!')
          .setFooter('You can type \'view\', \'time\' \'add\', or \'remove\'.');

        // SEND THE EMBED
        message.channel.send(no_subscriptions).catch(console.error).then( msg => {
          return initiate_collector(MAIN, 'view', message, msg, nickname, prefix);
        });
      }
      else{

        // CREATE THE EMBED
        let quest_subs = new Discord.RichEmbed()
          .setAuthor(nickname, message.member.user.displayAvatarURL)
          .setTitle('Quest Subscriptions')
          .setDescription('Overall Status: `'+user[0].status+'`\n'
                         +'Quest Status: `'+user[0].quests_status+'`\n'
                         +'Delivery Time: '+user[0].alert_time)
          .addField('Your Subscriptions:','**'+user[0].quests.toString().replace(/,/g,'\n')+'**',false)
          .setFooter('You can type \'view\', \'time\' \'add\', or \'remove\'.');

        // SEND THE EMBED
        message.channel.send(quest_subs).catch(console.error).then( msg => {
          return initiate_collector(MAIN, 'view', message, msg, nickname, prefix);
        });
      }
    }
  });
}

// QUEST TIME FUNCTION
async function subscription_time(MAIN, message, nickname, prefix){

  // PULL THE USER'S SUBSCRITIONS FROM THE USER TABLE
  MAIN.database.query("SELECT * FROM pokebot.users WHERE user_id = ? AND discord_id = ?", [message.member.id, message.guild.id], async function (error, user, fields) {

    // RETRIEVE QUEST NAME FROM USER
    let sub = await sub_collector(MAIN, 'Time', nickname, message, user[0].alert_time, 'Must be in 00:00 24-Hour format and between 00:00-23:00.', undefined);
    if(sub.toLowerCase() == 'cancel'){ return message.reply('Subscription cancelled. Type `'+prefix+'quest` to restart.').then(m => m.delete(5000)).catch(console.error); }
    else if(sub.toLowerCase() == 'time'){ return message.reply('Your subscription has timed out.').then(m => m.delete(5000)).catch(console.error); }
    // UPDATE THE USER'S RECORD
    MAIN.database.query("UPDATE pokebot.users SET alert_time = ? WHERE user_id = ? AND discord_id = ?", [sub,message.member.id, message.guild.id], function (error, user, fields) {
      if(error){ return message.reply('There has been an error, please contact an Admin to fix.').then(m => m.delete(5000)).catch(console.error); }
      else{
        let subscription_success = new Discord.RichEmbed().setColor('00ff00')
          .setAuthor(nickname, message.member.user.displayAvatarURL)
          .setTitle('Time Changed!')
          .setDescription('`'+sub+'` Saved to the Pokébot Database.')
          .setFooter('You can type \'view\', \'time\' \'add\', \'remove\', \'pause\' or \'resume\'.');
        message.channel.send(subscription_success).then( msg => {
          return initiate_collector(MAIN, 'time', message, msg, nickname, prefix);
        });
      }
    });
  });
}

// SUBSCRIPTION CREATE FUNCTION
async function subscription_create(MAIN, message, nickname, prefix){

  //DECLARE VARIABLES
  let index ='', quests = '';

  // PULL THE USER'S SUBSCRITIONS FROM THE USER TABLE
  MAIN.database.query("SELECT * FROM pokebot.users WHERE user_id = ? AND discord_id = ?", [message.member.id, message.guild.id], async function (error, user, fields) {

    // RETRIEVE QUEST NAME FROM USER
    let sub = await sub_collector(MAIN, 'Name', nickname, message, user[0].quests, 'Names are not case-sensitive. The Check denotes you are already subscribed to that Reward.', undefined);
    if(sub.toLowerCase() == 'cancel'){ return message.reply('Subscription cancelled. Type `'+prefix+'quest` to restart.').then(m => m.delete(5000)).catch(console.error); }
    else if(sub == 'time'){ return message.reply('Your subscription has timed out.').then(m => m.delete(5000)).catch(console.error); }

    // DEFINED VARIABLES
    if(user[0].quests){
      quests = user[0].quests.split(',');
      index = quests.indexOf(sub);
    }
    let rewards = MAIN.config.QUEST.Rewards.toString().toLowerCase().split(',');
    let reward_index = rewards.indexOf(sub.toLowerCase());

    // CHECK IF THE USER ALREADY HAS SUBSCRIPTIONS AND ADD
    if(!user[0].quests){ quests = sub; }
    else{
      if(index >= 0){ return message.reply('You are already subscribed to this quest reward.').then(m => m.delete(10000)).catch(console.error); }
      else{ quests.push(MAIN.config.QUEST.Rewards[reward_index]); }
    }

    // CONVERT ARRAY TO STRING
    quests = quests.toString();

    // UPDATE THE USER'S RECORD
    MAIN.database.query("UPDATE pokebot.users SET quests = ? WHERE user_id = ? AND discord_id = ?", [quests, message.member.id, message.guild.id], function (error, user, fields) {
      if(error){ return message.reply('There has been an error, please contact an Admin to fix.').then(m => m.delete(10000)).catch(console.error); }
      else{
        let subscription_success = new Discord.RichEmbed().setColor('00ff00')
          .setAuthor(nickname, message.member.user.displayAvatarURL)
          .setTitle(sub+' Subscription Complete!')
          .setDescription('Saved to the Pokébot Database.')
          .setFooter('You can type \'view\', \'time\' \'add\', \'remove\', \'pause\' or \'resume\'.');
        message.channel.send(subscription_success).then( msg => {
          return initiate_collector(MAIN, 'create', message, msg, nickname, prefix);
        });
      }
    });
  });
}

// SUBSCRIPTION REMOVE FUNCTION
async function subscription_remove(MAIN, message, nickname, prefix){

  // PULL THE USER'S SUBSCRITIONS FROM THE USER TABLE
  MAIN.database.query("SELECT * FROM pokebot.users WHERE user_id = ? AND discord_id = ?", [message.member.id, message.guild.id], async function (error, user, fields) {

    // RETRIEVE QUEST NAME FROM USER
    let sub = await sub_collector(MAIN, 'Remove', nickname, message, user[0].quests, 'Names are not case-sensitive.', undefined);
    if(sub.toLowerCase() == 'cancel'){ return message.reply('Subscription cancelled. Type `'+prefix+'quest` to restart.').then(m => m.delete(5000)).catch(console.error); }
    else if(sub == 'time'){ return message.reply('Your subscription has timed out.').then(m => m.delete(5000)).catch(console.error); }

    // DEFINED VARIABLES
    let quests = user[0].quests.split(',');
    let index = quests.indexOf(sub);
    let rewards = MAIN.config.QUEST.Rewards.toString().toLowerCase().split(',');
    let reward_index = rewards.indexOf(sub.toLowerCase());

    // CHECK IF THE USER ALREADY HAS SUBSCRIPTIONS AND ADD
    if(!user[0].quests){

      // CREATE THE EMBED
      let no_subscriptions = new Discord.RichEmbed()
        .setAuthor(nickname, message.member.user.displayAvatarURL)
        .setTitle('You do not have any Quest Subscriptions!')
        .setFooter('You can type \'view\', \'time\' \'add\', or \'remove\'.');

      // SEND THE EMBED
      message.channel.send(no_subscriptions).catch(console.error).then( msg => {
        return initiate_collector(MAIN, 'remove', message, msg, nickname, prefix);
      });
    }
    else if(sub == 'ALL'){
      let sub = await sub_collector(MAIN, 'Confirm-Remove', nickname, message, user[0].quests, 'Type \'Yes\' or \'No\'', undefined);
      if(sub.toLowerCase() == 'cancel'){ return message.reply('Subscription cancelled. Type `'+prefix+'quest` to restart.').then(m => m.delete(5000)).catch(console.error); }
      else{ quests = ''; }
    }
    else{
      if(index < 0){

        // CREATE THE EMBED
        let no_quest = new Discord.RichEmbed()
          .setAuthor(nickname, message.member.user.displayAvatarURL)
          .setTitle('You are not Subscribed to that Quest!')
          .setFooter('You can type \'view\', \'time\' \'add\', or \'remove\'.');

        // SEND THE EMBED
        message.channel.send(no_quest).catch(console.error).then( msg => {
          return initiate_collector(MAIN, 'remove', message, msg, nickname, prefix);
        });
      }
      else{ quests.splice(index,1); }
    }

    // CONVERT THE ARRAY TO A STRING
    quests = quests.toString();

    // UPDATE THE USER'S RECORD
    MAIN.database.query("UPDATE pokebot.users SET quests = ? WHERE user_id = ? AND discord_id = ?", [quests, message.member.id, message.guild.id], function (error, user, fields) {
      if(error){ return message.reply('There has been an error, please contact an Admin to fix.').then(m => m.delete(10000)).catch(console.error); }
      else{

        let subscription_success = new Discord.RichEmbed().setColor('00ff00')
          .setAuthor(nickname, message.member.user.displayAvatarURL)
          .setTitle(sub+' Subscription Removed!')
          .setFooter('Saved to the Pokébot Database.')
          .setDescription('Saved to the Pokébot Database.')
          .setFooter('You can type \'view\', \'time\' \'add\', \'remove\', \'pause\' or \'resume\'.');

        message.channel.send(subscription_success).then( msg => {
          return initiate_collector(MAIN, 'remove', message, msg, nickname, prefix);
        });
      }
    });
  });
}

// SUB COLLECTOR FUNCTION
async function sub_collector(MAIN,type,nickname,message,user_quests,requirements,sub){
  return new Promise( async function(resolve, reject) {

    // DELCARE VARIABLES
    let timeout = true, instruction = '', reward_list = '', user_rewards = '';

    // DEFINE COLLECTOR AND FILTER
    const filter = cMessage => cMessage.member.id == message.member.id;
    const collector = message.channel.createMessageCollector(filter, { time: 30000 });

    switch(type){

      // QUEST NAME EMBED
      case 'Name':
        if(user_quests){ user_rewards = user_quests.split(','); }
        else{ user_rewards = 'None';  }
        // CREATE REWARD LIST AND ADD CHECK FOR SUBSCRIBED REWARDS
        await MAIN.config.QUEST.Rewards.forEach((reward,index) => {
          if(user_rewards.indexOf(reward) >= 0){ reward_list += reward+' '+MAIN.emotes.checkYes+'\n'; }
          else{ reward_list += reward+'\n'; }
        });
        if(!reward_list){ reward_list = user_rewards; }
        instruction = new Discord.RichEmbed()
          .setAuthor(nickname, message.member.user.displayAvatarURL)
          .setTitle('What Quest would you like to Subscribe to?')
          .addField('Available Quest Rewards:', reward_list, false)
          .setFooter(requirements); break;

      // CONFIRM REMOVEAL OF ALL REWARDS
      case 'Confirm-Remove':
        instruction = new Discord.RichEmbed()
          .setAuthor(nickname, message.member.user.displayAvatarURL)
          .setTitle('Are you sure you want to Remove ALL of your subscriptions?')
          .setFooter(requirements); break;

      // REMOVEAL EMBED
      case 'Remove':
        let sub_list = user_quests.split(',').toString().replace(/,/g,'\n');
        instruction = new Discord.RichEmbed()
          .setAuthor(nickname, message.member.user.displayAvatarURL)
          .setTitle('What Quest do you want to remove?')
          .addField('Your Subscriptions:', '**'+sub_list+'**', false)
          .setFooter(requirements); break;

      // REMOVEAL EMBED
      case 'Time':
        instruction = new Discord.RichEmbed()
          .setAuthor(nickname, message.member.user.displayAvatarURL)
          .setTitle('What time do you want to set for Quest DM Alerts?')
          .setDescription('Current Time: `'+user_quests+'`')
          .setFooter(requirements); break;
    }

    message.channel.send(instruction).catch(console.error).then( msg => {

      // DEFINE COLLECTOR AND FILTER
      const filter = cMessage => cMessage.member.id==message.member.id;
      const collector = message.channel.createMessageCollector(filter, { time: 30000 });

      // FILTER COLLECT EVENT
      collector.on('collect', message => {
        switch(true){

          // CANCEL SUB
          case message.content.toLowerCase() == 'cancel': collector.stop('cancel'); break;

          // QUEST NAME
          case type.indexOf('Name')>=0:
          case type.indexOf('Remove')>=0:
            if(message.content.toLowerCase() == 'all'){ collector.stop('ALL'); break; }
            for(let r = 0; r < MAIN.config.QUEST.Rewards.length+1; r++){
              if(r == MAIN.config.QUEST.Rewards.length+1){ message.reply('`'+message.content+'` doesn\'t appear to be a valid Quest reward. Please check the spelling and try again.').then(m => m.delete(5000)).catch(console.error); break; }
              else if(MAIN.config.QUEST.Rewards[r] && message.content.toLowerCase() == MAIN.config.QUEST.Rewards[r].toLowerCase()){
                collector.stop(MAIN.config.QUEST.Rewards[r]); break;
              }
            } break;

          case type.indexOf('Time')>=0:
            if(message.content.length < 6 && message.content.indexOf(':') >= 0){
              let times = message.content.split(':');
              console.log(parseInt(times[0]) >= 0+' '+parseInt(times[0]) < 23+' '+parseInt(times[1]) <= 59+' '+parseInt(times[1]) >= 0);
              if(parseInt(times[0]) >= 0 && parseInt(times[0]) < 23 && parseInt(times[1]) <= 59 && parseInt(times[1]) >= 0){
                collector.stop(message.content); break;
              }
              else{
                message.reply('`'+message.content+'` doesn\'t appear to be a valid Time. Please check the requirements and try again.').then(m => m.delete(5000)).catch(console.error); break;
              } break;
            }
            else{
              message.reply('`'+message.content+'` doesn\'t appear to be a valid Time. Please check the requirements and try again.').then(m => m.delete(5000)).catch(console.error); break;
            } break;

          // GET CONFIRMATION
          case type.indexOf('Confirm')>=0:
            if(message.content.toLowerCase() == 'yes'){ collector.stop('Yes'); }
            else if(message.content.toLowerCase() == 'no'){ collector.stop('No'); }
            else{ message.reply('`'+message.content+'` is an Invalid Input. '+requirements).then(m => m.delete(5000)).catch(console.error); } break;
        }
      });

      // COLLECTOR ENDED
      collector.on('end', (collected,reason) => {
        msg.delete();
        resolve(reason);
      });
    });
  });
}

function initiate_collector(MAIN, source, message, msg, nickname, prefix){

  // DEFINE COLLECTOR AND FILTER
  const filter = cMessage => cMessage.member.id==message.member.id;
  const collector = message.channel.createMessageCollector(filter, { time: 60000 });

  // FILTER COLLECT EVENT
  collector.on('collect', message => {
    switch(message.content.toLowerCase()){
      case 'add': collector.stop('add'); break;
      case 'remove': collector.stop('remove'); break;
      case 'view': collector.stop('view'); break;
      case 'pause': collector.stop('pause'); break;
      case 'resume': collector.stop('resume'); break;
      case 'time': collector.stop('settime'); break;
      default: collector.stop('end');
    }
  });

  // COLLECTOR HAS BEEN ENDED
  collector.on('end', (collected,reason) => {

    // DELETE ORIGINAL MESSAGE
    msg.delete();
    switch(reason){
      case 'add': subscription_create(MAIN, message, nickname, prefix); break;
      case 'remove': subscription_remove(MAIN, message, nickname, prefix); break;
      case 'view': subscription_view(MAIN, message, nickname, prefix); break;
      case 'settime': subscription_time(MAIN, message, nickname, prefix); break;
      case 'resume':
      case 'pause': subscription_status(MAIN, message, nickname, reason, prefix); break;
      default:
      if(source == 'start'){
        message.reply('Your subscription has timed out.').then(m => m.delete(5000)).catch(console.error);
      }
    } return;
  });
}
