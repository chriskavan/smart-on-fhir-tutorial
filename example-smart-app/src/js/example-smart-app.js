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

        var fhirServerServiceUrl = smart.server.serviceUrl;
        var fhirServerServiceUrlInfo = fhirServerServiceUrl.split("/");
        var fhirVersion = fhirServerServiceUrlInfo[3];
        var fhirTenant = fhirServerServiceUrlInfo[4];
        console.log('fhirVersion: ',fhirVersion);
        console.log('fhirTenantId: ',fhirTenant);

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
        //Appointment.Search for patient
        if (fhirVersion = "r4") {
          var appt = smart.patient.api.fetchAll({
                    type: 'Appointment',
                    query: {
                      date: 'ge2021-01-29T00:00:00.000Z'
                    }
                  });          
        } else {
          var appt = smart.patient.api.fetchAll({
                    type: 'Appointment',
                    query: {
                      //date: ['ge2021-01-26','le2021-03-26']
                      /* This leads to something like this: /Appointment?date=ge2021-01-26%7Cle2021-03-26&patient={patientid}
                      date: {
                        $and: ['ge2021-01-26','le2021-03-26']
                      }
                      */
                      date: '2021'
                    }
                  });          
        }

        
        //DocumentReference.Search for patient
        
        var docref = smart.patient.api.fetchAll({
                    type: 'DocumentReference',
                    query: {
                      count: 10  //but that just changes the size of the page, not how many total results are returned
                    }
                  });        
        
        $.when(pt, obv, appt,docref).fail(onError);

        $.when(pt, obv, appt,docref).done(function(patient, obv, appt,docref) {
          var byCodes = smart.byCodes(obv, 'code');
          var gender = patient.gender;

          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
              fname = patient.name[0].given.join(' ');
                            
            if (patient.name[0].family instanceof Array) {
              lname = patient.name[0].family.join(' ');
            } else {
              lname = patient.name[0].family;
            }
            

          }
          
          //Add pattymcid
          var pattymcid = '';
          pattymcid = patient.id;

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
          p.pattymcid = pattymcid;
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
          apptparticipant = appt[0].participant[0].actor.display;
          apptreason = '';
          apptdescription = appt[0].description;
          apptstartdt = appt[0].start;
          apptenddt = appt[0].end;
          apptduration = appt[0].minutesDuration;
          apptcomment = appt[0].text.div;
          if (fhirVersion = "r4") {
            appttype = appt[0].serviceType[0].text;
          } else {
            appttype = appt[0].type.text;
          }
          
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

          console.log('Trying the DocumentReference thing:',docref);
          var docrefid = '';
          var docrefverid = '';
          var docreflastupdated = '';
          var docrefstatustext = '';
          var docrefstatusresource = '';
          var docrefstatusdocument = '';
          var docreftype = '';
          var docreftypecode = '';
          var docrefcodesystem = '';
          var docreftext = '';
          
          docrefid = docref[0].id;
          docrefverid = docref[0].meta.versionId;
          docreflastupdated = docref[0].meta.lastUpdated;
          docrefstatustext = docref[0].text.status;
          docrefstatusresource = docref[0].status;
          docreftype = docref[0].type.text;
          docreftypecode = docref[0].type.coding[0].code;
          docrefcodesystem = docref[0].type.coding[0].system;
          docreftext = docref[0].text.div;
          if (fhirVersion = "r4") {
            docrefstatusdocument = docref[0].docStatus;
          } else {
            docrefstatusdocument = docref[0].docStatus.coding[0].display;
          }
          p.docrefid = docrefid;
          p.docrefverid = docrefverid;
          p.docreflastupdated = docreflastupdated;
          p.docrefstatustext = docrefstatustext;
          p.docrefstatusresource = docrefstatusresource;
          p.docrefstatusdocument = docrefstatusdocument;
          p.docreftype = docreftype;
          p.docreftypecode = docreftypecode;
          p.docrefcodesystem = docrefcodesystem;
          p.docreftext = docreftext;
          
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
      docrefid: {value: ''},
      docrefverid: {value: ''},
      docreflastupdated: {value: ''},
      docrefstatustext: {value: ''},
      docrefstatusresource: {value: ''},
      docrefstatusdocument: {value: ''},
      docreftype: {value: ''},
      docreftypecode: {value: ''},
      docrefcodesystem: {value: ''},
      docreftext: {value: ''},
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
    $('#docrefid').html(p.docrefid);
    $('#docrefverid').html(p.docrefverid);
    $('#docreflastupdated').html(p.docreflastupdated);
    $('#docrefstatustext').html(p.docrefstatustext);
    $('#docrefstatusresource').html(p.docrefstatusresource);
    $('#docrefstatusdocument').html(p.docrefstatusdocument);
    $('#docreftype').html(p.docreftype);
    $('#docreftypecode').html(p.docreftypecode);
    $('#docrefcodesystem').html(p.docrefcodesystem);
    $('#docreftext').html(p.docreftext);
  };
  
  window.buildTable = function(t) {
    $('#tableview').show();
  };
  
})(window);
