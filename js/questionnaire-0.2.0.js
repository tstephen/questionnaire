var TRANSITION_DURATION = 500;

jQuery(document).ready(function() {
  console.log('ready event handler');
  if (ractive.tenantCallbacks==undefined) ractive.tenantCallbacks = $.Callbacks();
  ractive.tenantCallbacks.add(function() {
    ractive.ajaxSetup();
    ractive.initAutoComplete();
  });
  //ractive.initAutoComplete();
  ractive.fetch();
});

var ractive = new Ractive({
  el: 'containerSect',
  template: '#template',
  data: {
    q: function () {
      return ractive.toQuestionnaire(ractive.get('questionCategories'));
    },
    questionnaireName: 'cps-questionnaire',
    toId: function(name) {
      return name.toLowerCase().replace(/ /g,'_').replace('(','').replace(')','');
    },
    toQName: function(i,j) {
if (ractive==undefined) return;
      return ractive.get('q.questionCategories.'+i+'.questions.'+j+'.id');
    }
  },
  fetch: function() {
    console.info('fetch');
    $.ajax({
       type: 'GET',
       url: 'js/'+ractive.get('questionnaireName')+'.json',
       dataType: 'json',
       success: function(data, textStatus, jqxhr) {
         console.log('success:'+data);
         $.each(data.questionCategories, function(i,d) {
           $.each(d.questions, function(j,e) {
             e.optionValues = [];
           });
         });
         
         ractive.set('q', data);
       }
    });
  },
  getRefData: function(name,ctrlSelector) {
    $.ajax({
       type: 'GET',
       url: ractive.get('themeDir')+'/js/'+name+'.json',
       dataType: 'json',
       success: function(data, textStatus, jqxhr) {
         console.log('success:'+data);
         ractive.merge(name, data._embedded[name]);
         $(ctrlSelector).typeahead({ source:data });
       }
    });
  },
  getRemoteRefData: function(name,ctrlSelector) {
    $.ajax({
       type: 'GET',
       url: ractive.getServer()+'/'+name,
       crossDomain: true,
       dataType: 'json',
       username: localStorage['username'],
       password: localStorage['password'],
       headers: {
         "Authorization": "Basic " + btoa(localStorage['username'] + ":" + localStorage['password'])
       },
       xhrFields: {withCredentials: true},
       success: function(data, textStatus, jqxhr) {
         console.log('success:'+data);
         ractive.merge(name, data._embedded[name]);
         $(ctrlSelector).typeahead({ source:data });
       }
    });
  },
  initAutoComplete: function() {
    //ractive.getRefData('defraDeccCategories',"#curDefraDeccCategory");
    //ractive.getRefData('defraDeccCodes',"#curDefraDeccCode")
    //ractive.getRefData('eClassS2s','#curEClass');
    //ractive.getRefData('financialYears','#curFinancialYear');
  },
  matchProducts: function() {
    var matched = false;
    jQuery.each(ractive.get('questionCategories'), function(i,d) {
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
    //this.ajaxSetup();
  },
  revealDetails: function(id) {
    console.log('show details for: '+id);
    $('#'+id+'Details').slideDown(TRANSITION_DURATION).removeClass('hidden');
  },
  saveMatrix: function(id,cat,q,opt) {
    console.info('saveMatrix: id: '+id+',cat:'+cat+',q:'+q+',opt:'+opt);
    var response = ractive.get('q.questionCategories.'+cat+'.questions.'+q+'.response');
console.log('  response:'+JSON.stringify(response));
    if (response==undefined) response = {}; 
console.log('  response:'+JSON.stringify(response));
    response[id] = $('#'+id).prop('checked');
console.log('  checked:'+$('#'+id).prop('checked'));
console.log('  response:'+JSON.stringify(response));
    ractive.set('q.questionCategories.'+cat+'.questions.'+q+'.response',response);
  },
  sendMessage: function() {
    if (document.forms['questionnaireForm'].checkValidity()) {
      var q = ractive.get('q');
      var quCustomFields = ractive.toQuestionnaire(q.questionCategories);
      var contact = ractive.get('contact');
      contact.accountType = q.contact.accountType;
      contact.enquiryType = q.about.name;
      contact.email = q.about.email;
      contact.owner = q.about.email;
      contact.stage = 'New Questionnaire';
      contact.tenantId = q.tenantId;
      contact.customFields = quCustomFields; 
      contact.tenantId = q.tenantId;
      console.log('Sending message: '+JSON.stringify(contact));
      // $('html, body').css("cursor", "wait");
      return $.ajax({
          url: q.submit.endpoint+q.submit.msgName,
          type: 'POST',
          data: {
            json:JSON.stringify(contact),
            msg_namespace:q.submit.tenantId,
            msg_name:q.submit.msgName,
            action:'p_proxy'
          },
          success: completeHandler = function(data, textStatus, jqXHR) {
            console.log('data: '+ data);
            window.location.href = q.submit.successPage;
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
    if (fadeOutMessages && additionalClass!='bg-danger text-danger') setTimeout(function() {
      $('#messages').fadeOut();
    }, EASING_DURATION*10);
    else $('#messages').append('<span class="text-danger pull-right glyphicon glyphicon-remove" onclick="ractive.hideMessage()"></span>');
  },
  toQuestionnaire: function(cats) {
    console.log('toQuestionnaire: '+cats);
    var o = new Object();
    $.each(cats, function(i,d){
      $.each(d.questions, function(j,e){
        o[e.id] = e.response;
      });
    });
    return o;
  },
  toggleFieldHint: function(id) { 
    console.log('toggleFieldHint');
    if ($('#'+id+'Hint:visible').length == 0) {
      $('#'+id+'Hint').slideDown(TRANSITION_DURATION).removeClass('hidden');
    } else { 
      $('#'+id+'Hint').slideUp(TRANSITION_DURATION);
    }
  }
});
