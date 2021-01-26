(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                              'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                              'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
                      }
                    }
                  });          
        var appt = smart.patient.api.fetchAll({
                    type: 'Appointment',
                    query: {
                      date: {
                        $or: ['2021']           //This is just a way to get the Appointments.Search call to work
                      }
                    }
                  });

        $.when(pt, obv, appt).fail(onError);

        $.when(pt, obv, appt).done(function(patient, obv, appt) {
          var byCodes = smart.byCodes(obv, 'code');
          var gender = patient.gender;

          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family.join(' ');
          }

          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');

          var p = defaultPatient();
          p.birthdate = patient.birthDate;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.height = getQuantityValueAndUnit(height[0]);

          if (typeof systolicbp != 'undefined')  {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);
          
          //Creating appt vars
          var apptid = '';
          var apptstatus = '';
          var appttype = '';
          var apptparticipant = '';
          var apptreason = '';
          var apptdescription = '';
          var apptstartdt = '';
          var apptenddt = '';
          var apptduration = '';
          var apptcomment = '';
          
          console.log('Trying the Appt thing:',appt);
          
          apptid = appt[0].id;
          apptstatus = appt[0].status;
          appttype = appt[0].type.text;
          apptparticipant = appt[0].participant[0].actor.display;
          apptreason = '';
          apptdescription = appt[0].description;
          apptstartdt = appt[0].start;
          apptenddt = appt[0].end;
          apptduration = appt[0].minutesDuration;
          apptcomment = appt[0].text.div;
          
          p.apptid = apptid;
          p.apptstatus = apptstatus;
          p.appttype = appttype;
          p.apptparticipant = apptparticipant;
          p.apptreason = apptreason;
          p.apptdescription = apptdescription;
          p.apptstartdt = apptstartdt;
          p.apptenddt = apptenddt;
          p.apptduration = apptduration;
          p.apptcomment = apptcomment;

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
      pattymcid: {value: ''},
      apptid: {value: ''},
      apptstatus: {value: ''},
      appttype: {value: ''},
      apptparticipant: {value: ''},
      apptreason: {value: ''},
      apptdescription: {value: ''},
      apptstartdt: {value: ''},
      apptenddt: {value: ''},
      apptduration: {value: ''},
      apptcomment: {value: ''},      
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
    $('#pattymcid').html(p.pattymcid);
    $('#apptid').html(p.apptid);
    $('#apptstatus').html(p.apptstatus);
    $('#appttype').html(p.appttype);
    $('#apptparticipant').html(p.apptparticipant);
    $('#apptreason').html(p.apptreason);
    $('#apptdescription').html(p.apptdescription);
    $('#apptstartdt').html(p.apptstartdt);
    $('#apptenddt').html(p.apptenddt);
    $('#apptduration').html(p.apptduration);
    $('#apptcomment').html(p.apptcomment);
  };

})(window);
