import React from "react";

export interface MTAFeedHeader {
  gtfsRealtimeVersion: string;
  timestamp: number;
}

export interface Trip {
  tripId: string;
  startDate: string;
  startTime?: string;
  routeId: string;
  direction?: number;
}

export interface StopTimeUpdate {
  stopId: string;
  arrival?: {
    time?: number;
    delay?: number;
    uncertainty?: number;
  };
  departure?: {
    time?: number;
    delay?: number;
    uncertainty?: number;
  };
  scheduleRelationship?: "SCHEDULED" | "SKIPPED" | "NO_DATA";
}

export interface TripUpdate {
  trip: Trip;
  stopTimeUpdates: StopTimeUpdate[];
  timestamp?: number;
}

export interface VehiclePosition {
  trip: Trip;
  position?: {
    latitude: number;
    longitude: number;
    bearing?: number;
    speed?: number;
  };
  currentStopSequence?: number;
  currentStatus?: "INCOMING_AT" | "STOPPED_AT" | "IN_TRANSIT_TO";
  timestamp?: number;
  stopId?: string;
}

export interface Alert {
  activePeriod: Array<{
    start?: number;
    end?: number;
  }>;
  informedEntity: Array<{
    agencyId?: string;
    routeId?: string;
    routeType?: number;
    trip?: Trip;
    stopId?: string;
  }>;
  cause?: string;
  effect?: string;
  url?: {
    translation: Array<{
      text: string;
      language?: string;
    }>;
  };
  headerText?: {
    translation: Array<{
      text: string;
      language?: string;
    }>;
  };
  descriptionText?: {
    translation: Array<{
      text: string;
      language?: string;
    }>;
  };
}

export interface FeedEntity {
  id: string;
  tripUpdate?: TripUpdate;
  vehicle?: VehiclePosition;
  alert?: Alert;
}

export interface ParsedMTAFeed {
  header: MTAFeedHeader;
  entities: FeedEntity[];
}

export interface MTAFeedURLs {
  ace: string;
  bdfm: string;
  g: string;
  jz: string;
  nqrw: string;
  l: string;
  "1234567": string;
  si: string;
}

export const MTA_FEED_URLS: MTAFeedURLs = {
  ace: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
  bdfm: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  g: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g",
  jz: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
  nqrw: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
  l: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l",
  "1234567":
    "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  si: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si",
};

let MTA_API_KEY = process.env.EXPO_PUBLIC_MTA_API_KEY || '';

export const setMTAApiKey = (apiKey: string) => {
  MTA_API_KEY = apiKey;
};

export class MTARealtimeParser {
  private parseVarint(
    buffer: Uint8Array,
    offset: number,
  ): { value: number; length: number } {
    let value = 0;
    let shift = 0;
    let length = 0;

    while (offset + length < buffer.length) {
      const byte = buffer[offset + length];
      value |= (byte & 0x7f) << shift;
      length++;

      if ((byte & 0x80) === 0) {
        break;
      }

      shift += 7;
    }

    return { value, length };
  }

  private parseString(
    buffer: Uint8Array,
    offset: number,
    length: number,
  ): string {
    const bytes = buffer.slice(offset, offset + length);
    return new TextDecoder().decode(bytes);
  }

  private parseFixed32(buffer: Uint8Array, offset: number): number {
    return (
      buffer[offset] |
      (buffer[offset + 1] << 8) |
      (buffer[offset + 2] << 16) |
      (buffer[offset + 3] << 24)
    );
  }

  private parseFixed64(buffer: Uint8Array, offset: number): number {
    const low = this.parseFixed32(buffer, offset);
    const high = this.parseFixed32(buffer, offset + 4);
    return low + high * 0x100000000;
  }

  private parseField(
    buffer: Uint8Array,
    offset: number,
  ): {
    fieldNumber: number;
    wireType: number;
    value: any;
    nextOffset: number;
  } {
    const tag = this.parseVarint(buffer, offset);
    const fieldNumber = tag.value >>> 3;
    const wireType = tag.value & 0x07;
    let currentOffset = offset + tag.length;
    let value: any;

    switch (wireType) {
      case 0: {
        const varint = this.parseVarint(buffer, currentOffset);
        value = varint.value;
        currentOffset += varint.length;
        break;
      }
      case 1: {
        value = this.parseFixed64(buffer, currentOffset);
        currentOffset += 8;
        break;
      }
      case 2: {
        const length = this.parseVarint(buffer, currentOffset);
        currentOffset += length.length;
        value = buffer.slice(currentOffset, currentOffset + length.value);
        currentOffset += length.value;
        break;
      }
      case 5: {
        value = this.parseFixed32(buffer, currentOffset);
        currentOffset += 4;
        break;
      }
      default:
        throw new Error(`Unknown wire type: ${wireType}`);
    }

    return { fieldNumber, wireType, value, nextOffset: currentOffset };
  }

  private parseMessage(buffer: Uint8Array): Map<number, any[]> {
    const fields = new Map<number, any[]>();
    let offset = 0;

    while (offset < buffer.length) {
      const field = this.parseField(buffer, offset);

      if (!fields.has(field.fieldNumber)) {
        fields.set(field.fieldNumber, []);
      }
      fields.get(field.fieldNumber)!.push(field.value);

      offset = field.nextOffset;
    }

    return fields;
  }

  private parseHeader(headerBuffer: Uint8Array): MTAFeedHeader {
    const fields = this.parseMessage(headerBuffer);

    return {
      gtfsRealtimeVersion: fields.has(1)
        ? this.parseString(fields.get(1)![0], 0, fields.get(1)![0].length)
        : "1.0",
      timestamp: fields.has(3) ? fields.get(3)![0] : Date.now() / 1000,
    };
  }

  private parseTrip(tripBuffer: Uint8Array): Trip {
    const fields = this.parseMessage(tripBuffer);

    return {
      tripId: fields.has(1)
        ? this.parseString(fields.get(1)![0], 0, fields.get(1)![0].length)
        : "",
      routeId: fields.has(5)
        ? this.parseString(fields.get(5)![0], 0, fields.get(5)![0].length)
        : "",
      startDate: fields.has(2)
        ? this.parseString(fields.get(2)![0], 0, fields.get(2)![0].length)
        : "",
      startTime: fields.has(4)
        ? this.parseString(fields.get(4)![0], 0, fields.get(4)![0].length)
        : undefined,
      direction: fields.has(6) ? fields.get(6)![0] : undefined,
    };
  }

  private parseStopTimeEvent(eventBuffer: Uint8Array): {
    time?: number;
    delay?: number;
    uncertainty?: number;
  } {
    const fields = this.parseMessage(eventBuffer);

    return {
      time: fields.has(1) ? fields.get(1)![0] : undefined,
      delay: fields.has(2) ? fields.get(2)![0] : undefined,
      uncertainty: fields.has(3) ? fields.get(3)![0] : undefined,
    };
  }

  private parseStopTimeUpdate(updateBuffer: Uint8Array): StopTimeUpdate {
    const fields = this.parseMessage(updateBuffer);

    return {
      stopId: fields.has(4)
        ? this.parseString(fields.get(4)![0], 0, fields.get(4)![0].length)
        : "",
      arrival: fields.has(2)
        ? this.parseStopTimeEvent(fields.get(2)![0])
        : undefined,
      departure: fields.has(3)
        ? this.parseStopTimeEvent(fields.get(3)![0])
        : undefined,
      scheduleRelationship: fields.has(5)
        ? (["SCHEDULED", "SKIPPED", "NO_DATA"] as const)[fields.get(5)![0]]
        : undefined,
    };
  }

  private parseTripUpdate(tripUpdateBuffer: Uint8Array): TripUpdate {
    const fields = this.parseMessage(tripUpdateBuffer);

    const stopTimeUpdates: StopTimeUpdate[] = [];
    if (fields.has(2)) {
      for (const updateBuffer of fields.get(2)!) {
        stopTimeUpdates.push(this.parseStopTimeUpdate(updateBuffer));
      }
    }

    return {
      trip: fields.has(1)
        ? this.parseTrip(fields.get(1)![0])
        : { tripId: "", routeId: "", startDate: "" },
      stopTimeUpdates,
      timestamp: fields.has(4) ? fields.get(4)![0] : undefined,
    };
  }

  private parsePosition(positionBuffer: Uint8Array): {
    latitude: number;
    longitude: number;
    bearing?: number;
    speed?: number;
  } {
    const fields = this.parseMessage(positionBuffer);

    const latBytes = fields.has(1) ? fields.get(1)![0] : new Uint8Array(4);
    const lonBytes = fields.has(2) ? fields.get(2)![0] : new Uint8Array(4);

    const latView = new DataView(latBytes.buffer, latBytes.byteOffset, 4);
    const lonView = new DataView(lonBytes.buffer, lonBytes.byteOffset, 4);

    return {
      latitude: latView.getFloat32(0, true),
      longitude: lonView.getFloat32(0, true),
      bearing: fields.has(3)
        ? new DataView(
            fields.get(3)![0].buffer,
            fields.get(3)![0].byteOffset,
            4,
          ).getFloat32(0, true)
        : undefined,
      speed: fields.has(4)
        ? new DataView(
            fields.get(4)![0].buffer,
            fields.get(4)![0].byteOffset,
            4,
          ).getFloat32(0, true)
        : undefined,
    };
  }

  private parseVehiclePosition(vehicleBuffer: Uint8Array): VehiclePosition {
    const fields = this.parseMessage(vehicleBuffer);

    const statusMap = ["INCOMING_AT", "STOPPED_AT", "IN_TRANSIT_TO"] as const;

    return {
      trip: fields.has(1)
        ? this.parseTrip(fields.get(1)![0])
        : { tripId: "", routeId: "", startDate: "" },
      position: fields.has(2)
        ? this.parsePosition(fields.get(2)![0])
        : undefined,
      currentStopSequence: fields.has(3) ? fields.get(3)![0] : undefined,
      stopId: fields.has(7)
        ? this.parseString(fields.get(7)![0], 0, fields.get(7)![0].length)
        : undefined,
      currentStatus: fields.has(4) ? statusMap[fields.get(4)![0]] : undefined,
      timestamp: fields.has(5) ? fields.get(5)![0] : undefined,
    };
  }

  private parseTranslatedString(translatedBuffer: Uint8Array): {
    translation: Array<{ text: string; language?: string }>;
  } {
    const fields = this.parseMessage(translatedBuffer);
    const translations: Array<{ text: string; language?: string }> = [];

    if (fields.has(1)) {
      for (const transBuffer of fields.get(1)!) {
        const transFields = this.parseMessage(transBuffer);
        translations.push({
          text: transFields.has(1)
            ? this.parseString(
                transFields.get(1)![0],
                0,
                transFields.get(1)![0].length,
              )
            : "",
          language: transFields.has(2)
            ? this.parseString(
                transFields.get(2)![0],
                0,
                transFields.get(2)![0].length,
              )
            : undefined,
        });
      }
    }

    return { translation: translations };
  }

  private parseAlert(alertBuffer: Uint8Array): Alert {
    const fields = this.parseMessage(alertBuffer);

    const activePeriod: Array<{ start?: number; end?: number }> = [];
    if (fields.has(1)) {
      for (const periodBuffer of fields.get(1)!) {
        const periodFields = this.parseMessage(periodBuffer);
        activePeriod.push({
          start: periodFields.has(1) ? periodFields.get(1)![0] : undefined,
          end: periodFields.has(2) ? periodFields.get(2)![0] : undefined,
        });
      }
    }

    const informedEntity: Array<any> = [];
    if (fields.has(5)) {
      for (const entityBuffer of fields.get(5)!) {
        const entityFields = this.parseMessage(entityBuffer);
        informedEntity.push({
          agencyId: entityFields.has(1)
            ? this.parseString(
                entityFields.get(1)![0],
                0,
                entityFields.get(1)![0].length,
              )
            : undefined,
          routeId: entityFields.has(2)
            ? this.parseString(
                entityFields.get(2)![0],
                0,
                entityFields.get(2)![0].length,
              )
            : undefined,
          routeType: entityFields.has(3) ? entityFields.get(3)![0] : undefined,
          trip: entityFields.has(4)
            ? this.parseTrip(entityFields.get(4)![0])
            : undefined,
          stopId: entityFields.has(5)
            ? this.parseString(
                entityFields.get(5)![0],
                0,
                entityFields.get(5)![0].length,
              )
            : undefined,
        });
      }
    }

    return {
      activePeriod,
      informedEntity,
      cause: fields.has(6)
        ? this.parseString(fields.get(6)![0], 0, fields.get(6)![0].length)
        : undefined,
      effect: fields.has(7)
        ? this.parseString(fields.get(7)![0], 0, fields.get(7)![0].length)
        : undefined,
      url: fields.has(8)
        ? this.parseTranslatedString(fields.get(8)![0])
        : undefined,
      headerText: fields.has(10)
        ? this.parseTranslatedString(fields.get(10)![0])
        : undefined,
      descriptionText: fields.has(11)
        ? this.parseTranslatedString(fields.get(11)![0])
        : undefined,
    };
  }

  private parseEntity(entityBuffer: Uint8Array): FeedEntity {
    const fields = this.parseMessage(entityBuffer);

    return {
      id: fields.has(1)
        ? this.parseString(fields.get(1)![0], 0, fields.get(1)![0].length)
        : "",
      tripUpdate: fields.has(2)
        ? this.parseTripUpdate(fields.get(2)![0])
        : undefined,
      vehicle: fields.has(3)
        ? this.parseVehiclePosition(fields.get(3)![0])
        : undefined,
      alert: fields.has(4) ? this.parseAlert(fields.get(4)![0]) : undefined,
    };
  }

  public parse(buffer: Uint8Array): ParsedMTAFeed {
    const fields = this.parseMessage(buffer);

    const header = fields.has(1)
      ? this.parseHeader(fields.get(1)![0])
      : { gtfsRealtimeVersion: "1.0", timestamp: Date.now() / 1000 };

    const entities: FeedEntity[] = [];
    if (fields.has(2)) {
      for (const entityBuffer of fields.get(2)!) {
        entities.push(this.parseEntity(entityBuffer));
      }
    }

    return { header, entities };
  }

  public async fetchAndParse(feedUrl: string): Promise<ParsedMTAFeed> {
    const headers: Record<string, string> = {};
    headers["x-api-key"] = MTA_API_KEY;

    const response = await fetch(feedUrl, { headers });
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    return this.parse(uint8Array);
  }

  public async fetchAllFeeds(): Promise<
    Record<keyof MTAFeedURLs, ParsedMTAFeed>
  > {
    const results = await Promise.all(
      Object.entries(MTA_FEED_URLS).map(async ([key, url]) => {
        const feed = await this.fetchAndParse(url);
        return [key, feed] as const;
      }),
    );

    return Object.fromEntries(results) as Record<
      keyof MTAFeedURLs,
      ParsedMTAFeed
    >;
  }
}

export const useMTAFeed = (feedKey?: keyof MTAFeedURLs) => {
  const [feed, setFeed] = React.useState<ParsedMTAFeed | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const parser = new MTARealtimeParser();

    const fetchFeed = async () => {
      try {
        setLoading(true);
        const url = feedKey ? MTA_FEED_URLS[feedKey] : MTA_FEED_URLS["1234567"];
        const parsedFeed = await parser.fetchAndParse(url);
        setFeed(parsedFeed);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();

    const interval = setInterval(fetchFeed, 30000);

    return () => clearInterval(interval);
  }, [feedKey]);

  return { feed, loading, error };
};

export const useMTAAllFeeds = () => {
  const [feeds, setFeeds] = React.useState<Record<
    keyof MTAFeedURLs,
    ParsedMTAFeed
  > | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const parser = new MTARealtimeParser();

    const fetchFeeds = async () => {
      try {
        setLoading(true);
        const allFeeds = await parser.fetchAllFeeds();
        setFeeds(allFeeds);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchFeeds();

    const interval = setInterval(fetchFeeds, 30000);

    return () => clearInterval(interval);
  }, []);

  return { feeds, loading, error };
};

export interface VehiclePositionWithRoute {
  vehicleId: string;
  routeId: string;
  tripId: string;
  direction?: number;
  position?: {
    latitude: number;
    longitude: number;
    bearing?: number;
    speed?: number;
  };
  currentStopId?: string;
  currentStatus?: "INCOMING_AT" | "STOPPED_AT" | "IN_TRANSIT_TO";
  timestamp?: number;
}

export const fetchCurrentVehiclePositions = async (
  feedKey?: keyof MTAFeedURLs,
): Promise<VehiclePositionWithRoute[]> => {
  const parser = new MTARealtimeParser();

  if (feedKey) {
    const feed = await parser.fetchAndParse(MTA_FEED_URLS[feedKey]);
    return feed.entities
      .filter((entity) => entity.vehicle)
      .map((entity) => ({
        vehicleId: entity.id,
        routeId: entity.vehicle!.trip.routeId,
        tripId: entity.vehicle!.trip.tripId,
        direction: entity.vehicle!.trip.direction,
        position: entity.vehicle!.position,
        currentStopId: entity.vehicle!.stopId,
        currentStatus: entity.vehicle!.currentStatus,
        timestamp: entity.vehicle!.timestamp,
      }));
  }

  const allFeeds = await parser.fetchAllFeeds();
  const allVehicles: VehiclePositionWithRoute[] = [];

  for (const feed of Object.values(allFeeds)) {
    const vehicles = feed.entities
      .filter((entity) => entity.vehicle)
      .map((entity) => ({
        vehicleId: entity.id,
        routeId: entity.vehicle!.trip.routeId,
        tripId: entity.vehicle!.trip.tripId,
        direction: entity.vehicle!.trip.direction,
        position: entity.vehicle!.position,
        currentStopId: entity.vehicle!.stopId,
        currentStatus: entity.vehicle!.currentStatus,
        timestamp: entity.vehicle!.timestamp,
      }));
    allVehicles.push(...vehicles);
  }

  return allVehicles;
};

export const useCurrentVehiclePositions = (feedKey?: keyof MTAFeedURLs) => {
  const [vehicles, setVehicles] = React.useState<VehiclePositionWithRoute[]>(
    [],
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const fetchPositions = async () => {
      try {
        setLoading(true);
        const positions = await fetchCurrentVehiclePositions(feedKey);
        setVehicles(positions);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();

    const interval = setInterval(fetchPositions, 30000);

    return () => clearInterval(interval);
  }, [feedKey]);

  return { vehicles, loading, error };
};