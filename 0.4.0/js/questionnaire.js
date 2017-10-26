var EASING_DURATION = 500;

jQuery(document).ready(function() {
  console.log('ready event handler');
  if (ractive.tenantCallbacks==undefined) ractive.tenantCallbacks = $.Callbacks();
  ractive.tenantCallbacks.add(function() {
    ractive.initAutoComplete();
  });
  var params = getSearchParameters();
  for (idx in Object.keys(params)) {
    ractive.set(Object.keys(params)[idx], params[Object.keys(params)[idx]]);
  }
  if (ractive.get('questionnaireDef')!=undefined) ractive.fetch();
});

var ractive = new Ractive({
  el: 'containerSect',
  template: '#template',
  data: {
    q: function () {
      return ractive.toQuestionnaire(ractive.get('categories'));
    },
    easingDuration: 500, // millis
    fadeOutMessages: true,
    questionnaireDef: $('body').data('questionnaire'),
    server: $env.server,
    toId: function(name) {
      return name.toLowerCase().replace(/ /g,'_').replace('(','').replace(')','');
    },
    stdPartials: [
      { "name": "questionnaire", "url": "partials/questionnaire.html"},
      { "name": "questionnaireContact", "url": "partials/questionnaire-contact.html"}
    ],
    toQName: function(i,j) {
      if (ractive==undefined) return;
      else return ractive.get('q.categories.'+i+'.questions.'+j+'.id');
    }
  },
  partials: {
    loginSect: '',
    questionnaire: ''
  },
  addDataList: function(d, data) {
    $('datalist#'+d.name).remove();
    $('body').append('<datalist id="'+d.name+'">');
    $.each(data, function (i,e) {
      $('datalist#'+d.name).append('<option value="'+e.name+'">'+e.name+'</option>');
    });
  },
  addSelectOptions: function(selector, data, value) {
    console.info('add selection options to '+selector+' selecting '+value);
    $(selector+' option').remove();
    $.each(data, function (i,e) {
      $(selector).append('<option '+(e.name==value ? 'selected ' : '')
          +'value="'+e.name+'">'+e.name+'</option>');
    });
  },
  applyBranding: function() {
    if (ractive.get('q.about.branding.favicon')!=undefined) {
      $('head').append('<link rel="icon" type="image/png" href="'+ractive.get('q.about.branding.favicon')+'">');
    }
    if (ractive.get('q.about.branding.link')!=undefined) {
      $('.navbar-brand').attr('href', ractive.get('q.about.branding.link'));
    }
    if (ractive.get('q.about.branding.logo')!=undefined) {
      $('.navbar-brand').empty().append('<img alt="logo" height="45px" src="'+ractive.get('q.about.branding.logo')+'"/>');
    }
  },
  fetch: function() {
    console.info('fetch');
    var url = ractive.get('questionnaireDef');
    if (!url.startsWith('http')) url = 'js/'+ractive.get('questionnaireDef')+'.json';
    $.ajax({
       type: 'GET',
       url: url,
       dataType: 'json',
       success: function(data, textStatus, jqxhr) {
         console.log('success:'+data);
         for (var i = 0 ; i < data.categories.length ; i++) {
           for (var j = 0 ; j < data.categories[i].length ; j++) {
             data.categories[i][j].optionValues = [];
           }
         }

         // sane defaults
         if (data['activeCategory']==undefined) data.activeCategory = 0;
         if (data['about']==undefined) data.about = { };
         if (data.about['branding']!=undefined) $('nav.navbar').show();
         if (data.about['title']==undefined) data.about.title = 'Questionnaire';
         if (data.about['options']==undefined) data.about.options = { };
         if (data.about.options['categoryAtATime']==undefined) data.about.options.categoryAtATime = true;
         if (data['submit']==undefined) data.submit = { };
         if (data.submit['buttonText']==undefined) data.submit.buttonText = 'Submit Now';
         if (data.submit['successPage']==undefined) data.submit.successPage = 'thanks.html';
         if (data.submit['title']==undefined) data.submit.title = "That's it!";
         if (data.submit['text']==undefined) data.submit.text = 'Thanks for your time.';

         ractive.set('q', data);
         ractive.applyBranding();
         if (ractive.fetchCallbacks!=null) ractive.fetchCallbacks.fire( data );
       }
    });
  },
  getServer: function() {
    return ractive.get('server')==undefined ? '' : ractive.get('server');
  },
  hash: function(email) {
    if (email==undefined) return;
    return hex_md5(email.trim().toLowerCase());
  },
  hideMessage: function() {
    $('#messages, .messages').hide();
  },
  initAutoComplete: function() {
    console.log('initAutoComplete');
    if (ractive.get('tenant.typeaheadControls')!=undefined && ractive.get('tenant.typeaheadControls').length>0) {
      $.each(ractive.get('tenant.typeaheadControls'), function(i,d) {
        //console.log('binding ' +d.url+' to typeahead control: '+d.selector);
        if (d.url==undefined) {
          ractive.addDataList(d,d.values);
        } else {
          $.getJSON(ractive.getServer()+d.url, function(data){
            if (data == null || !Array.isArray(data)) {
              console.info('No values for datalist: '+d.name+', probably refreshing token');
            } else {
              d.values = data;
              ractive.addDataList(d,d.values);
            }
          })
          .fail(function(jqXHR, textStatus, errorThrown) {
            if (jqXHR.status == 401) console.info('No values for datalist: '+d.name+', need to refresh token or login again');
            else console.error('No values for datalist: '+d.name+', please check configuration');
          });
        }
      });
    }
  },
  loadStandardPartial: function(name,url) {
    //console.log('loading...: '+d.name)
      $.get(url, function(response){
        //console.log('... loaded: '+d.name)
        //console.log('response: '+response)
        if (ractive != undefined) {
          try {
            ractive.resetPartial(name,response);
          } catch (e) {
            console.error('Unable to reset partial '+name+': '+e);
          }
        }
      });
    },
  loadStandardPartials: function(stdPartials) {
    console.info('loadStandardPartials');
    $.each(stdPartials, function(i,d) {
      //console.log('loading...: '+d.name)
      $.get(d.url, function(response){
        //console.log('... loaded: '+d.name)
        //console.log('response: '+response)
        if (ractive != undefined) {
          try {
            ractive.resetPartial(d.name,response);
          } catch (e) {
            console.error('Unable to reset partial '+d.name+': '+e);
          }
        }
      });
    });
  },
  matchProducts: function() {
    var matched = false;
    jQuery.each(ractive.get('categories'), function(i,d) {
      jQuery.each(ractive.get('contact.account.products.category'), function(j,e) {
        console.log(d.defraRelevant+ ' match : '+e+'?');
        if ((d.always!=undefined && d.always==true) || (d.defraRelevant!=undefined && d.defraRelevant.indexOf(e.toUpperCase().replace(/ /g, '_'))!=-1)) {
          console.log('  show '+d.category+': ');
          $('#'+d.category+' input[data-required="true"]').attr('required','required');
          $('#'+d.category).slideDown();
        } else {
          console.log('  hide '+d.category+': '+d.always +','+d.defraRelevant+','+ d.defraRelevant) ;
          $('#'+d.category+' input').removeAttr('required');
          $('#'+d.category).hide();
        }
      });
    });
  },
  oninit: function() {
    console.info('oninit');
  },
  revealDetails: function(id) {
    console.log('show details for: '+id);
    $('#'+id+'Details').slideDown(ractive.get('easingDuration')).removeClass('hidden');
  },
  saveMatrix: function(id,cat,q,opt) {
    console.info('saveMatrix: id: '+id+',cat:'+cat+',q:'+q+',opt:'+opt);
    var response = ractive.get('q.categories.'+cat+'.questions.'+q+'.response');
console.log('  response:'+JSON.stringify(response));
    if (response==undefined) response = {};
console.log('  response:'+JSON.stringify(response));
    response[id] = $('#'+id).prop('checked');
console.log('  checked:'+$('#'+id).prop('checked'));
console.log('  response:'+JSON.stringify(response));
    ractive.set('q.categories.'+cat+'.questions.'+q+'.response',response);
  },
  sendMessage: function() {
    if (document.forms['questionnaireForm'].checkValidity()) {
      var q = ractive.get('q');
      var quCustomFields = ractive.toQuestionnaire(q.categories);
      var contact = ractive.get('contact');
      if (contact != undefined) {
        if (contact['enquiryType']==undefined) contact.enquiryType = q.about.name;
        if (contact['email']==undefined) contact.email = q.about.email;
        if (contact['owner']==undefined) contact.owner = q.about.email;
        if (contact['message']==undefined) contact.message = q.submit.message;
        if (contact['stage']==undefined) contact.stage = 'New Questionnaire';
        if (contact['tenantId']==undefined) contact.tenantId = q.submit.tenantId;
      } else {
        contact = { };
      }
      contact.customFields = quCustomFields;
      console.log('Sending message: '+JSON.stringify(contact));
      // $('html, body').css("cursor", "wait");
      return $.ajax({
          url: q.submit.endpoint+q.submit.msgName,
          type: 'POST',
          data: { json: JSON.stringify(contact) },
          dataType:'text',
          success: completeHandler = function(data, textStatus, jqXHR) {
            console.log('data: '+ data);
            window.location.href = q.submit.successPage+'?questionnaire='+ractive.get('questionnaireDef');
          }
        });
    } else {
      $(':invalid').filter(':visible').addClass('form-error');
      $(':valid').filter(':visible').removeClass('form-error');
      $('.radio :invalid').parent().addClass('form-error');
      $('.radio :valid').parent().removeClass('form-error');
      $(':invalid').filter(':visible')[0].scrollIntoView();
      var msg = 'Your questionnaire is not yet complete, please correct the highlighted fields';
      console.log(msg);
      ractive.showError(msg);
    }
  },
  showError: function(msg) {
    this.showMessage(msg, 'bg-danger text-danger');
  },
  showFormError: function(formId, msg) {
    this.showError(msg);
    var selector = formId==undefined || formId=='' ? ':invalid' : '#'+formId+' :invalid';
    $(selector).addClass('field-error');
    $(selector)[0].focus();
  },
  showMessage: function(msg, additionalClass) {
    console.log('showMessage: '+msg);
    if (additionalClass == undefined) additionalClass = 'bg-info text-info';
    if (msg === undefined) msg = 'Working...';
    $('#messages').empty().append(msg).removeClass().addClass(additionalClass).show();
//    document.getElementById('messages').scrollIntoView();
    if (ractive.get('fadeOutMessages') && additionalClass!='bg-danger text-danger') setTimeout(function() {
      $('#messages').fadeOut();
    }, (EASING_DURATION*10));
    else $('#messages').append('<span class="text-danger pull-right glyphicon glyphicon-btn glyphicon-remove" onclick="ractive.hideMessage()"></span>');
  },
  showReconnected: function() {
    console.log('showReconnected');
    $( "#ajax-loader" ).hide();
    if ($('#connectivityMessages:visible').length>0) {
      $('#connectivityMessages').remove();
      $('body').append('<div id="connectivityMessages" class="alert-info">Reconnected</div>').show();
      setTimeout(function() {
        $('#connectivityMessages').fadeOut();
      }, EASING_DURATION*10);
    }
  },
  toQuestionnaire: function(cats) {
    console.log('toQuestionnaire: '+cats);
    var o = new Object();
    $.each(cats, function(i,d){
      $.each(d.questions, function(j,e){
        o[e.name] = e.response;
      });
    });
    return o;
  },
  toggleFieldHint: function(id) {
    console.log('toggleFieldHint');
    if ($('#'+id+'Hint:visible').length == 0) {
      $('#'+id+'Hint').slideDown(ractive.get('easingDuration')).removeClass('hidden');
    } else {
      $('#'+id+'Hint').slideUp(ractive.get('easingDuration'));
    }
  }
});

$(document).ready(function() {
  if (ractive.partials['questionnaire'] == '') { // not yet loaded remote partials
    ractive.loadStandardPartials(ractive.get('stdPartials'));
  }
});

function getSearchParameters() {
  var prmstr = window.location.search.substr(1);
  return prmstr != null && prmstr != "" ? transformToAssocArray(prmstr) : {};
}

function transformToAssocArray( prmstr ) {
  var params = {};
  var prmarr = prmstr.split("&");
  for ( var i = 0; i < prmarr.length; i++) {
      var tmparr = prmarr[i].split("=");
      params[tmparr[0]] = tmparr[1];
  }
  return params;
}
