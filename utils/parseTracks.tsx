import Papa from 'papaparse';

export type TrackPoint = {
  frame: number;
  time: number;
  x_pixel: number;
  y_pixel: number;
};

export type ParsedTracks = Record<string, TrackPoint[]>;

export const parseCsvFiles = async (files: File[]): Promise<ParsedTracks> => {
    const parsedData: ParsedTracks = {};

    const parsePromises = files.map((file) => {
        return new Promise<void>((resolve, reject) => {
            Papa.parse<TrackPoint>(file, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    parsedData[file.name] = results.data;
                    resolve();
                },
                error: (error) => {
                    reject(error);
                },
            }); 
        });
    });

    await Promise.all(parsePromises);
    return parsedData;
};


