// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CardFactory, MessageFactory, TeamsActivityHandler } from "botbuilder";
import * as request from "request-promise";

export class DictionaryBot extends TeamsActivityHandler {
  private readonly apiEndpoint =
    "https://od-api.oxforddictionaries.com/api/v2/entries/en-us/";
  private readonly appId: string = process.env.OxyfordAppId;
  private readonly appKey: string = process.env.OxyfordAppKey;

  constructor() {
    super();
    // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
    this.onMessage(async (context, next) => {
      const text = context.activity.text;
      await context.sendActivity(
        MessageFactory.text(`Looking up "${text}" ...`)
      );
      try {
        const json = await request
          .get({
            headers: { app_id: this.appId, app_key: this.appKey },
            json: true,
            uri: `${this.apiEndpoint}${encodeURIComponent(text)}`
          })
          .promise();

        const card = cardPayload({
          from: json.metadata.provider,
          word: json.results[0].id,
          etymologies:
            json.results[0].lexicalEntries[0].entries[0].etymologies[0],
          category: json.results[0].lexicalEntries[0].lexicalCategory.text,
          definitions:
            json.results[0].lexicalEntries[0].entries[0].senses[0]
              .definitions[0]
        });

        console.log(card);

        await context.sendActivity(
          MessageFactory.attachment(CardFactory.adaptiveCard(card))
        );
      } catch (err) {
        await context.sendActivity(MessageFactory.text(JSON.stringify(err)));
      }
      await next();
    });
  }
}

const cardPayload = ({ word, category, definitions, etymologies, from }) => ({
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  type: "AdaptiveCard",
  version: "1.0",
  body: [
    {
      type: "TextBlock",
      text: word,
      weight: "Bolder",
      size: "ExtraLarge"
    },
    {
      type: "TextBlock",
      text: category,
      size: "Large",
      spacing: "Small"
    },
    {
      type: "ColumnSet",
      columns: [
        {
          type: "Column",
          width: "10px",
          items: []
        },
        {
          type: "Column",
          width: "stretch",
          items: [
            {
              type: "TextBlock",
              wrap: true,
              text: definitions
            }
          ]
        }
      ]
    },
    {
      type: "ColumnSet",
      columns: [
        {
          type: "Column",
          width: "10px",
          items: []
        },
        {
          type: "Column",
          width: "stretch",
          items: [
            {
              type: "TextBlock",
              text: `_Etymology_ ${etymologies}`,
              weight: "Lighter",
              wrap: true
            }
          ]
        }
      ]
    },
    {
      type: "TextBlock",
      text: `_${from}_`,
      horizontalAlignment: "Right"
    }
  ]
});
