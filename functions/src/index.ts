import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios, { AxiosRequestConfig } from 'axios';
import * as parser from 'fast-xml-parser';

admin.initializeApp({ credential: admin.credential.applicationDefault() });

const db = admin.firestore();

export const motorSportOrganizationEventReadJob = functions.pubsub.schedule('0 */1 * * *')
  .onRun(async (context) => {
    try {
      const activeOrganizations = await db.collection("ActiveOrganizations").get();

      for (let i = 0; i < activeOrganizations.size; i++) {
        const activeOrganizationID = activeOrganizations.docs[i].data()['motorsportreg-id'];

        const config: AxiosRequestConfig = {
          method: 'get',
          url: `https://api.motorsportreg.com/rest/calendars/organization/${activeOrganizationID}`,
          headers: { }
        };

        const res = await axios(config);
        const jsonObject = parser.parse(res.data);
        const race = jsonObject.response.events.event;

        race['plain-description'] = race.description.replace(/<[^>]+>/g, '');

        await db.collection("Organizations")
              .doc(activeOrganizationID)
              .collection('Races')
              .doc(race.id)
              .set(race);

        if (race.organization) {
          await db.collection("Organizations")
          .doc(activeOrganizationID)
          .set({
            name: race.organization.name,
            uri: race.organization.uri,
          });
        }
      }
    }
    catch (error) {
      console.log(error);
    }
    return null;
})